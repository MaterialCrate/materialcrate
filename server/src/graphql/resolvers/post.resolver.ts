import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../../config/prisma.js";
import { s3 } from "../../config/s3.js";
import {
  createNotification,
  NOTIFICATION_ICON,
  NOTIFICATION_TYPE,
} from "../../services/notifications.js";

type CreatePostArgs = {
  fileBase64: string;
  thumbnailBase64?: string;
  fileName: string;
  mimeType: string;
  title: string;
  categories: string[];
  description?: string;
  year?: number;
};

type UpdatePostArgs = {
  postId: string;
  title: string;
  categories: string[];
  description?: string;
  year?: number;
};

type PinPostArgs = {
  postId: string;
};

type TogglePostCommentsArgs = {
  postId: string;
};

type GraphQLContext = {
  user?: {
    sub?: string;
  };
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

const normalizeCategories = (categories: unknown): string[] => {
  if (!Array.isArray(categories)) {
    return [];
  }

  const normalized = categories
    .map((category) => (typeof category === "string" ? category.trim() : ""))
    .filter(Boolean)
    .map((category) => category.toLowerCase());

  return Array.from(new Set(normalized));
};

const buildS3FileUrl = (bucket: string, region: string, key: string) =>
  `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
const POST_FILE_SIGNED_URL_TTL_SECONDS = 60 * 60;
const POST_THUMBNAIL_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const MAX_POST_THUMBNAIL_BYTES = 2 * 1024 * 1024;

const extractS3KeyFromUrl = (
  fileUrl: string,
  bucket: string,
  region: string,
) => {
  try {
    const parsed = new URL(fileUrl);
    const expectedHost = `${bucket}.s3.${region}.amazonaws.com`;
    if (parsed.hostname !== expectedHost) {
      return null;
    }

    const key = parsed.pathname.replace(/^\/+/, "");
    return key ? decodeURIComponent(key) : null;
  } catch {
    return null;
  }
};

const getInaccessibleAuthorIds = async (viewerId?: string) => {
  if (!viewerId) {
    return [];
  }

  const blockers = await prisma.user.findMany({
    where: {
      blockedUserIds: {
        has: viewerId,
      },
    },
    select: { id: true },
  });

  return Array.from(new Set(blockers.map((user) => user.id)));
};

const getBlockedUserIdsForViewer = async (viewerId?: string) => {
  if (!viewerId) {
    return [];
  }

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { blockedUserIds: true },
  });

  return Array.isArray(viewer?.blockedUserIds) ? viewer.blockedUserIds : [];
};

const getPrivatePostAuthorIds = async (viewerId?: string) => {
  const privateAuthors = await (prisma as any).user.findMany({
    where: {
      visibilityPublicPosts: false,
      deleted: false,
      disabled: false,
      ...(viewerId
        ? {
            id: { not: viewerId },
            NOT: {
              followerRelations: {
                some: { followerId: viewerId },
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });

  return privateAuthors.map((u: any) => u.id);
};

const getPrivateCommentAuthorIds = async (viewerId?: string) => {
  const privateCommentAuthors = await (prisma as any).user.findMany({
    where: {
      visibilityPublicComments: false,
      deleted: false,
      disabled: false,
      ...(viewerId
        ? {
            id: { not: viewerId },
            NOT: {
              followerRelations: {
                some: { followerId: viewerId },
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });

  return privateCommentAuthors.map((u: any) => u.id);
};

const buildVisiblePostWhere = (
  uninterestedPostIds?: string[],
  inaccessibleAuthorIds?: string[],
) => ({
  deleted: false,
  ...(Array.isArray(uninterestedPostIds) && uninterestedPostIds.length > 0
    ? {
        id: {
          notIn: uninterestedPostIds,
        },
      }
    : {}),
  ...(Array.isArray(inaccessibleAuthorIds) && inaccessibleAuthorIds.length > 0
    ? {
        authorId: {
          notIn: inaccessibleAuthorIds,
        },
      }
    : {}),
  author: {
    is: {
      deleted: false,
      disabled: false,
    },
  },
});

const buildPostInclude = (viewerId?: string) => {
  const include: any = {
    author: true,
    _count: {
      select: {
        likes: true,
        comments: true,
      },
    },
  };

  if (viewerId) {
    include.likes = {
      where: { userId: viewerId },
      select: { userId: true },
    };
  }

  return include;
};

const mapPostForGraphQL = (post: any, viewerId?: string) => ({
  ...post,
  likeCount: post?._count?.likes ?? 0,
  commentCount: post?._count?.comments ?? 0,
  viewerHasLiked: viewerId ? (post?.likes?.length ?? 0) > 0 : false,
});

const buildPostVersionSnapshot = (
  post: {
    id: string;
    title: string;
    categories: string[];
    description?: string | null;
    year?: number | null;
    fileUrl: string;
    thumbnailUrl?: string | null;
  },
  versionNumber: number,
  editorId?: string | null,
) => ({
  postId: post.id,
  versionNumber,
  title: post.title,
  categories: post.categories,
  description: post.description ?? null,
  year: post.year ?? null,
  fileUrl: post.fileUrl,
  thumbnailUrl: post.thumbnailUrl ?? null,
  editorId: editorId ?? null,
});

const mapPostVersionForGraphQL = (version: any) => ({
  ...version,
  postId: version.postId,
});

const buildCommentInclude = (viewerId?: string) => {
  const include: any = {
    author: true,
    post: {
      include: {
        author: true,
      },
    },
    parent: {
      include: {
        author: true,
      },
    },
    _count: {
      select: {
        commentLikes: true,
        replies: true,
      },
    },
  };

  if (viewerId) {
    include.commentLikes = {
      where: { userId: viewerId },
      select: { userId: true },
    };
  }

  return include;
};

const mapCommentForGraphQL = (comment: any, viewerId?: string) => ({
  ...comment,
  likeCount: comment?._count?.commentLikes ?? 0,
  replyCount: comment?._count?.replies ?? 0,
  viewerHasLiked: viewerId ? (comment?.commentLikes?.length ?? 0) > 0 : false,
});

const sanitizeAuthorIdentity = (author: any) => {
  if (!author) return null;
  if (author.deleted) {
    return {
      ...author,
      displayName: "Deleted",
      username: "deleted",
      profilePicture: null,
      profilePictureUrl: null,
      subscriptionPlan: null,
    };
  }
  if (author.disabled) {
    return {
      ...author,
      displayName: "Disabled User",
      username: "disabled",
    };
  }
  return author;
};

export const PostResolver = {
  Query: {
    post: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const viewerId = ctx.user?.sub;
      const normalizedId = id?.trim();
      if (!normalizedId) {
        throw new Error("Post id is required");
      }

      const [blockedIds, privateIds] = await Promise.all([
        getInaccessibleAuthorIds(viewerId),
        getPrivatePostAuthorIds(viewerId),
      ]);
      const allHiddenIds = Array.from(new Set([...blockedIds, ...privateIds]));

      const post = await prisma.post.findFirst({
        where: {
          id: normalizedId,
          ...buildVisiblePostWhere(undefined, allHiddenIds),
        },
        include: buildPostInclude(viewerId),
      });

      return post ? mapPostForGraphQL(post, viewerId) : null;
    },
    postVersions: async (
      _: unknown,
      { postId }: { postId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const normalizedPostId = postId?.trim();
      if (!normalizedPostId) {
        throw new Error("Post id is required");
      }

      const inaccessibleAuthorIds = await getInaccessibleAuthorIds(viewerId);
      const post = await prisma.post.findUnique({
        where: { id: normalizedPostId },
        select: { id: true, deleted: true, authorId: true },
      });

      if (!post || post.deleted) {
        throw new Error("Post not found");
      }

      if (post.authorId && inaccessibleAuthorIds.includes(post.authorId)) {
        throw new Error("Post not found");
      }

      const versions = await (prisma as any).postVersion.findMany({
        where: { postId: normalizedPostId },
        include: {
          editor: true,
        },
        orderBy: [{ versionNumber: "desc" }, { createdAt: "desc" }],
      });

      return versions.map((version: any) => mapPostVersionForGraphQL(version));
    },
    posts: async (
      _: unknown,
      {
        authorUsername,
        limit = 50,
        offset = 0,
      }: {
        authorUsername?: string | null;
        limit?: number;
        offset?: number;
      },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const normalizedAuthorUsername = String(authorUsername || "").trim();
      const safeLimit = Math.max(1, Math.min(limit, 100));
      const safeOffset = Math.max(0, offset);
      const viewer = viewerId
        ? await prisma.user.findUnique({
            where: { id: viewerId },
            select: { uninterestedPostIds: true, blockedUserIds: true },
          })
        : null;
      const uninterestedPostIds = Array.isArray(viewer?.uninterestedPostIds)
        ? viewer.uninterestedPostIds
        : [];
      const [blockedByIds, blockedIds, privatePostIds] = await Promise.all([
        getInaccessibleAuthorIds(viewerId),
        getBlockedUserIdsForViewer(viewerId),
        getPrivatePostAuthorIds(viewerId),
      ]);
      const inaccessibleAuthorIds = normalizedAuthorUsername
        ? Array.from(new Set([...blockedByIds]))
        : Array.from(
            new Set([...blockedByIds, ...blockedIds, ...privatePostIds]),
          );
      const posts = await prisma.post.findMany({
        where: normalizedAuthorUsername
          ? {
              deleted: false,
              ...(inaccessibleAuthorIds.length > 0
                ? {
                    authorId: {
                      notIn: inaccessibleAuthorIds,
                    },
                  }
                : {}),
              author: {
                username: {
                  equals: normalizedAuthorUsername,
                  mode: "insensitive",
                },
                deleted: false,
                disabled: false,
              },
            }
          : buildVisiblePostWhere(uninterestedPostIds, inaccessibleAuthorIds),
        include: buildPostInclude(viewerId),
        orderBy: (normalizedAuthorUsername
          ? [{ pinned: "desc" }, { createdAt: "desc" }]
          : { createdAt: "desc" }) as any,
        take: safeLimit,
        skip: safeOffset,
      });

      return posts.map((post) => mapPostForGraphQL(post, viewerId));
    },
    searchPosts: async (
      _: unknown,
      { query, limit = 12 }: { query: string; limit?: number },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const normalizedQuery = String(query || "").trim();

      if (!normalizedQuery) {
        return [];
      }

      const safeLimit = Math.max(1, Math.min(limit, 25));
      const numericYear = Number.parseInt(normalizedQuery, 10);
      const [blockedIds, privateIds] = await Promise.all([
        getInaccessibleAuthorIds(viewerId),
        getPrivatePostAuthorIds(viewerId),
      ]);
      const inaccessibleAuthorIds = Array.from(
        new Set([...blockedIds, ...privateIds]),
      );

      const posts = await prisma.post.findMany({
        where: {
          ...buildVisiblePostWhere(undefined, inaccessibleAuthorIds),
          OR: [
            {
              title: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              categories: {
                has: normalizedQuery.toLowerCase(),
              },
            },
            {
              description: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            ...(Number.isFinite(numericYear)
              ? [
                  {
                    year: numericYear,
                  },
                ]
              : []),
            {
              author: {
                is: {
                  deleted: false,
                  disabled: false,
                  OR: [
                    {
                      username: {
                        contains: normalizedQuery,
                        mode: "insensitive",
                      },
                    },
                    {
                      displayName: {
                        contains: normalizedQuery,
                        mode: "insensitive",
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
        include: buildPostInclude(viewerId),
        orderBy: {
          createdAt: "desc",
        },
        take: safeLimit,
      });

      return posts.map((post) => mapPostForGraphQL(post, viewerId));
    },
    comments: async (
      _: unknown,
      {
        postId,
        parentCommentId = null,
        limit = 50,
        offset = 0,
      }: {
        postId: string;
        parentCommentId?: string | null;
        limit?: number;
        offset?: number;
      },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const safeLimit = Math.max(1, Math.min(limit, 100));
      const safeOffset = Math.max(0, offset);
      const hiddenCommentAuthorIds = await getPrivateCommentAuthorIds(viewerId);

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, deleted: true },
      });
      if (!post || post.deleted) {
        throw new Error("Post not found");
      }

      const comments = await (prisma as any).comment.findMany({
        where: {
          postId,
          parentId: parentCommentId,
          ...(hiddenCommentAuthorIds.length > 0
            ? {
                OR: [
                  {
                    authorId: {
                      notIn: hiddenCommentAuthorIds,
                    },
                  },
                  ...(viewerId
                    ? [
                        {
                          post: {
                            authorId: viewerId,
                          },
                        },
                      ]
                    : []),
                ],
              }
            : {}),
        },
        include: buildCommentInclude(viewerId),
        orderBy: { createdAt: "desc" },
        take: safeLimit,
        skip: safeOffset,
      });

      return comments.map((comment: any) =>
        mapCommentForGraphQL(comment, viewerId),
      );
    },
  },
  Mutation: {
    createPost: async (_: unknown, args: CreatePostArgs, ctx: any) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION;

      if (!bucket || !region) {
        throw new Error("S3 bucket configuration is missing");
      }

      const {
        fileBase64,
        thumbnailBase64,
        fileName,
        mimeType,
        title,
        categories,
        description,
        year,
      } = args;

      const normalizedCategories = normalizeCategories(categories);

      if (!fileBase64 || !fileName || !mimeType || !title) {
        throw new Error("Missing required post fields");
      }

      if (normalizedCategories.length < 1 || normalizedCategories.length > 3) {
        throw new Error("Posts must have between 1 and 3 categories");
      }

      const normalizedMime = mimeType.toLowerCase();
      const normalizedName = fileName.toLowerCase();
      const isPdf =
        normalizedMime === "application/pdf" || normalizedName.endsWith(".pdf");
      if (!isPdf) {
        throw new Error("Only PDF files are allowed");
      }

      const fileBuffer = Buffer.from(fileBase64, "base64");
      if (!fileBuffer.length) {
        throw new Error("Uploaded file is empty");
      }

      const key = `documents/${Date.now()}-${randomUUID()}-${sanitizeFileName(fileName)}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: "application/pdf",
        }),
      );

      const fileUrl = buildS3FileUrl(bucket, region, key);
      let thumbnailUrl: string | null = null;

      if (typeof thumbnailBase64 === "string" && thumbnailBase64.trim()) {
        try {
          const thumbnailBuffer = Buffer.from(thumbnailBase64, "base64");
          if (
            thumbnailBuffer.length > 0 &&
            thumbnailBuffer.length <= MAX_POST_THUMBNAIL_BYTES
          ) {
            const thumbnailBaseName =
              fileName.replace(/\.pdf$/i, "") || "document";
            const thumbnailKey = `thumbnails/${Date.now()}-${randomUUID()}-${sanitizeFileName(
              thumbnailBaseName,
            )}.webp`;

            await s3.send(
              new PutObjectCommand({
                Bucket: bucket,
                Key: thumbnailKey,
                Body: thumbnailBuffer,
                ContentType: "image/webp",
              }),
            );

            thumbnailUrl = buildS3FileUrl(bucket, region, thumbnailKey);
          }
        } catch {
          thumbnailUrl = null;
        }
      }

      const createdPost = await prisma.$transaction(async (tx) => {
        const nextPost = await tx.post.create({
          data: {
            fileUrl,
            thumbnailUrl,
            title: title.trim(),
            categories: normalizedCategories,
            description: description?.trim() || null,
            year: Number.isFinite(year) ? year : null,
            authorId: ctx.user.sub,
          },
        });

        await (tx as any).postVersion.create({
          data: buildPostVersionSnapshot(nextPost, 1, ctx.user.sub),
        });

        return tx.post.findUnique({
          where: { id: nextPost.id },
          include: buildPostInclude(ctx.user.sub),
        });
      });

      if (!createdPost) {
        throw new Error("Failed to create post");
      }

      return mapPostForGraphQL(createdPost, ctx.user.sub);
    },
    updatePost: async (
      _: unknown,
      args: UpdatePostArgs,
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedPostId = args.postId?.trim();
      const normalizedTitle = args.title?.trim();
      const normalizedCategories = normalizeCategories(args.categories);
      const normalizedDescription = args.description?.trim() || null;
      const normalizedYear = Number.isFinite(args.year) ? args.year : null;

      if (!normalizedPostId) {
        throw new Error("Post id is required");
      }

      if (!normalizedTitle || normalizedCategories.length < 1) {
        throw new Error("Title and at least one category are required");
      }

      if (normalizedCategories.length > 3) {
        throw new Error("Posts can have at most 3 categories");
      }

      const existingPost = await prisma.post.findUnique({
        where: { id: normalizedPostId },
        select: {
          id: true,
          authorId: true,
          deleted: true,
          pinned: true,
          title: true,
          categories: true,
          description: true,
          year: true,
          fileUrl: true,
          thumbnailUrl: true,
        },
      });

      if (!existingPost || existingPost.deleted) {
        throw new Error("Post not found");
      }

      if (existingPost.authorId !== viewerId) {
        throw new Error("You can only edit your own posts");
      }

      const updatedPost = await prisma.$transaction(async (tx) => {
        const latestVersion = await (tx as any).postVersion.findFirst({
          where: { postId: normalizedPostId },
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
        });

        let nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

        if (!latestVersion) {
          await (tx as any).postVersion.create({
            data: buildPostVersionSnapshot(
              existingPost,
              nextVersionNumber,
              viewerId,
            ),
          });
          nextVersionNumber += 1;
        }

        const nextPost = await tx.post.update({
          where: { id: normalizedPostId },
          data: {
            title: normalizedTitle,
            categories: normalizedCategories,
            description: normalizedDescription,
            year: normalizedYear,
          },
        });

        await (tx as any).postVersion.create({
          data: buildPostVersionSnapshot(nextPost, nextVersionNumber, viewerId),
        });

        return tx.post.findUnique({
          where: { id: normalizedPostId },
          include: buildPostInclude(viewerId),
        });
      });

      if (!updatedPost) {
        throw new Error("Post not found");
      }

      return mapPostForGraphQL(updatedPost, viewerId);
    },
    pinPostToProfile: async (
      _: unknown,
      { postId }: PinPostArgs,
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedPostId = postId?.trim();
      if (!normalizedPostId) {
        throw new Error("Post id is required");
      }

      const existingPost = await (prisma as any).post.findUnique({
        where: { id: normalizedPostId },
        select: { id: true, authorId: true, pinned: true, deleted: true },
      });

      if (!existingPost || existingPost.deleted) {
        throw new Error("Post not found");
      }

      if (existingPost.authorId !== viewerId) {
        throw new Error("You can only pin your own posts");
      }

      if (existingPost.pinned) {
        await (prisma as any).post.update({
          where: { id: normalizedPostId },
          data: { pinned: false },
        });
      } else {
        await prisma.$transaction([
          (prisma as any).post.updateMany({
            where: {
              authorId: viewerId,
              deleted: false,
              pinned: true,
              NOT: { id: normalizedPostId },
            },
            data: { pinned: false },
          }),
          (prisma as any).post.update({
            where: { id: normalizedPostId },
            data: { pinned: true },
          }),
        ]);
      }

      const pinnedPost = await prisma.post.findUnique({
        where: { id: normalizedPostId },
        include: buildPostInclude(viewerId),
      });

      if (!pinnedPost || pinnedPost.deleted) {
        throw new Error("Post not found");
      }

      return mapPostForGraphQL(pinnedPost, viewerId);
    },
    togglePostComments: async (
      _: unknown,
      { postId }: TogglePostCommentsArgs,
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedPostId = postId?.trim();
      if (!normalizedPostId) {
        throw new Error("Post id is required");
      }

      const existingPost = await prisma.post.findUnique({
        where: { id: normalizedPostId },
        select: {
          id: true,
          authorId: true,
          commentsDisabled: true,
          deleted: true,
        },
      });

      if (!existingPost || existingPost.deleted) {
        throw new Error("Post not found");
      }

      if (existingPost.authorId !== viewerId) {
        throw new Error("You can only change comments on your own posts");
      }

      const updatedPost = await prisma.post.update({
        where: { id: normalizedPostId },
        data: { commentsDisabled: !existingPost.commentsDisabled },
        include: buildPostInclude(viewerId),
      });

      return mapPostForGraphQL(updatedPost, viewerId);
    },
    markPostNotInterested: async (
      _: unknown,
      { postId }: { postId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedPostId = postId?.trim();
      if (!normalizedPostId) {
        throw new Error("Post id is required");
      }

      const post = await prisma.post.findFirst({
        where: {
          id: normalizedPostId,
          ...buildVisiblePostWhere(),
        },
        select: { id: true, authorId: true },
      });

      if (!post) {
        throw new Error("Post not found");
      }

      if (post.authorId === viewerId) {
        throw new Error("You cannot hide your own post");
      }

      const viewer = await prisma.user.findUnique({
        where: { id: viewerId },
        select: { uninterestedPostIds: true },
      });

      const uninterestedPostIds = Array.isArray(viewer?.uninterestedPostIds)
        ? viewer.uninterestedPostIds
        : [];

      if (!uninterestedPostIds.includes(normalizedPostId)) {
        await prisma.user.update({
          where: { id: viewerId },
          data: {
            uninterestedPostIds: {
              push: normalizedPostId,
            },
          },
        });
      }

      return true;
    },
    deletePost: async (
      _: unknown,
      { postId }: { postId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedPostId = postId?.trim();
      if (!normalizedPostId) {
        throw new Error("Post id is required");
      }

      const existingPost = await prisma.post.findUnique({
        where: { id: normalizedPostId },
        select: { id: true, authorId: true, deleted: true },
      });

      if (!existingPost || existingPost.deleted) {
        throw new Error("Post not found");
      }

      if (existingPost.authorId !== viewerId) {
        throw new Error("You can only delete your own posts");
      }

      await prisma.post.update({
        where: { id: normalizedPostId },
        data: {
          deleted: true,
          deletedAt: new Date(),
          pinned: false,
        },
      });

      return true;
    },
    togglePostLike: async (
      _: unknown,
      { postId }: { postId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          authorId: true,
          commentsDisabled: true,
          deleted: true,
        },
      });
      if (!post || post.deleted) {
        throw new Error("Post not found");
      }

      if (post.commentsDisabled && post.authorId !== viewerId) {
        throw new Error("Comments are disabled for this post");
      }

      const existingLike = await prisma.like.findUnique({
        where: {
          userId_postId: {
            userId: viewerId,
            postId,
          },
        },
      });

      if (existingLike) {
        await prisma.like.delete({
          where: {
            userId_postId: {
              userId: viewerId,
              postId,
            },
          },
        });

        if (post.authorId && post.authorId !== viewerId) {
          const latestLikeNotification = await (
            prisma as any
          ).notification.findFirst({
            where: {
              userId: post.authorId,
              actorId: viewerId,
              type: NOTIFICATION_TYPE.POST_LIKE,
            },
            select: { id: true },
            orderBy: { time: "desc" },
          });

          if (latestLikeNotification?.id) {
            await (prisma as any).notification.delete({
              where: { id: latestLikeNotification.id },
            });
          }
        }
      } else {
        await prisma.like.create({
          data: {
            userId: viewerId,
            postId,
          },
        });

        if (post.authorId && post.authorId !== viewerId) {
          const actor = await prisma.user.findUnique({
            where: { id: viewerId },
            select: { displayName: true, username: true, profilePicture: true },
          });
          const actorLabel =
            actor?.displayName?.trim() || actor?.username?.trim() || "Someone";

          await createNotification({
            userId: post.authorId,
            actorId: viewerId,
            type: NOTIFICATION_TYPE.POST_LIKE,
            title: "New like",
            description: `${actorLabel} liked your post.`,
            icon: NOTIFICATION_ICON.POST_LIKE,
            profilePicture: actor?.profilePicture,
          });
        }
      }

      const updatedPost = await prisma.post.findUnique({
        where: { id: postId },
        include: buildPostInclude(viewerId),
      });
      if (!updatedPost || updatedPost.deleted) {
        throw new Error("Post not found");
      }

      return mapPostForGraphQL(updatedPost, viewerId);
    },
    createComment: async (
      _: unknown,
      {
        postId,
        content,
        parentCommentId,
      }: {
        postId: string;
        content: string;
        parentCommentId?: string | null;
      },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedContent = content?.trim();
      if (!normalizedContent) {
        throw new Error("Comment content is required");
      }
      if (normalizedContent.length > 2000) {
        throw new Error("Comment content cannot exceed 2000 characters");
      }

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, deleted: true, authorId: true },
      });
      if (!post || post.deleted) {
        throw new Error("Post not found");
      }

      const normalizedParentCommentId = parentCommentId?.trim() || null;
      if (normalizedParentCommentId) {
        const parentComment = await (prisma as any).comment.findUnique({
          where: { id: normalizedParentCommentId },
          select: { id: true, postId: true },
        });
        if (!parentComment) {
          throw new Error("Parent comment not found");
        }
        if (parentComment.postId !== postId) {
          throw new Error("Parent comment does not belong to this post");
        }
      }

      const comment = await (prisma as any).comment.create({
        data: {
          postId,
          authorId: viewerId,
          parentId: normalizedParentCommentId,
          content: normalizedContent,
        },
        include: buildCommentInclude(viewerId),
      });

      if (post.authorId && post.authorId !== viewerId) {
        const actor = await prisma.user.findUnique({
          where: { id: viewerId },
          select: { displayName: true, username: true, profilePicture: true },
        });
        const actorLabel =
          actor?.displayName?.trim() || actor?.username?.trim() || "Someone";

        await createNotification({
          userId: post.authorId,
          type: normalizedParentCommentId
            ? NOTIFICATION_TYPE.COMMENT
            : NOTIFICATION_TYPE.COMMENT,
          title: normalizedParentCommentId ? "New reply" : "New comment",
          description: normalizedParentCommentId
            ? `${actorLabel} replied to a thread on your post.`
            : `${actorLabel} commented on your post.`,
          icon: NOTIFICATION_ICON.COMMENT,
          profilePicture: actor?.profilePicture,
        });
      }

      return mapCommentForGraphQL(comment, viewerId);
    },
    toggleCommentLike: async (
      _: unknown,
      { commentId }: { commentId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const comment = await (prisma as any).comment.findUnique({
        where: { id: commentId },
        select: { id: true, authorId: true, postId: true },
      });
      if (!comment) {
        throw new Error("Comment not found");
      }

      const hiddenCommentAuthorIds = await getPrivateCommentAuthorIds(viewerId);
      const commentPost = await (prisma as any).post.findUnique({
        where: { id: comment.postId },
        select: { authorId: true },
      });
      if (
        hiddenCommentAuthorIds.includes(comment.authorId) &&
        commentPost?.authorId !== viewerId
      ) {
        throw new Error("Comment not found");
      }

      const existingLike = await (prisma as any).commentLike.findUnique({
        where: {
          userId_commentId: {
            userId: viewerId,
            commentId,
          },
        },
      });

      if (existingLike) {
        await (prisma as any).commentLike.delete({
          where: {
            userId_commentId: {
              userId: viewerId,
              commentId,
            },
          },
        });

        if (comment.authorId && comment.authorId !== viewerId) {
          const latestLikeNotification = await (
            prisma as any
          ).notification.findFirst({
            where: {
              userId: comment.authorId,
              actorId: viewerId,
              type: NOTIFICATION_TYPE.COMMENT_LIKE,
            },
            select: { id: true },
            orderBy: { time: "desc" },
          });

          if (latestLikeNotification?.id) {
            await (prisma as any).notification.delete({
              where: { id: latestLikeNotification.id },
            });
          }
        }
      } else {
        await (prisma as any).commentLike.create({
          data: {
            userId: viewerId,
            commentId,
          },
        });

        if (comment.authorId && comment.authorId !== viewerId) {
          const actor = await prisma.user.findUnique({
            where: { id: viewerId },
            select: { displayName: true, username: true, profilePicture: true },
          });
          const actorLabel =
            actor?.displayName?.trim() || actor?.username?.trim() || "Someone";

          await createNotification({
            userId: comment.authorId,
            actorId: viewerId,
            type: NOTIFICATION_TYPE.COMMENT_LIKE,
            title: "Comment liked",
            description: `${actorLabel} liked your comment.`,
            icon: NOTIFICATION_ICON.COMMENT_LIKE,
            profilePicture: actor?.profilePicture,
          });
        }
      }

      const updatedComment = await (prisma as any).comment.findUnique({
        where: { id: commentId },
        include: buildCommentInclude(viewerId),
      });
      if (!updatedComment) {
        throw new Error("Comment not found");
      }

      return mapCommentForGraphQL(updatedComment, viewerId);
    },
  },
  Post: {
    author: (post: any) => sanitizeAuthorIdentity(post.author),
    fileUrl: async (post: any) => {
      const rawFileUrl = post.fileUrl?.trim();
      if (!rawFileUrl) {
        return rawFileUrl;
      }

      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION;
      if (!bucket || !region) {
        return rawFileUrl;
      }

      const key = extractS3KeyFromUrl(rawFileUrl, bucket, region);
      if (!key) {
        return rawFileUrl;
      }

      try {
        return await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
          { expiresIn: POST_FILE_SIGNED_URL_TTL_SECONDS },
        );
      } catch {
        return rawFileUrl;
      }
    },
    thumbnailUrl: async (post: any) => {
      const rawThumbnailUrl = post.thumbnailUrl?.trim();
      if (!rawThumbnailUrl) {
        return rawThumbnailUrl;
      }

      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION;
      if (!bucket || !region) {
        return rawThumbnailUrl;
      }

      const key = extractS3KeyFromUrl(rawThumbnailUrl, bucket, region);
      if (!key) {
        return rawThumbnailUrl;
      }

      try {
        return await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
          { expiresIn: POST_THUMBNAIL_SIGNED_URL_TTL_SECONDS },
        );
      } catch {
        return rawThumbnailUrl;
      }
    },
    likeCount: (post: any) => post.likeCount ?? post?._count?.likes ?? 0,
    commentCount: (post: any) =>
      post.commentCount ?? post?._count?.comments ?? 0,
    commentsDisabled: (post: any) => Boolean(post.commentsDisabled),
    comments: async (
      post: { id: string },
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const safeLimit = Math.max(1, Math.min(limit, 100));
      const safeOffset = Math.max(0, offset);
      const hiddenCommentAuthorIds = await getPrivateCommentAuthorIds(viewerId);

      const comments = await (prisma as any).comment.findMany({
        where: {
          postId: post.id,
          parentId: null,
          ...(hiddenCommentAuthorIds.length > 0
            ? {
                OR: [
                  {
                    authorId: {
                      notIn: hiddenCommentAuthorIds,
                    },
                  },
                  ...(viewerId
                    ? [
                        {
                          post: {
                            authorId: viewerId,
                          },
                        },
                      ]
                    : []),
                ],
              }
            : {}),
        },
        include: buildCommentInclude(viewerId),
        orderBy: { createdAt: "desc" },
        take: safeLimit,
        skip: safeOffset,
      });

      return comments.map((comment: any) =>
        mapCommentForGraphQL(comment, viewerId),
      );
    },
    viewerHasLiked: (post: any) => Boolean(post.viewerHasLiked),
    pinned: (post: any) => Boolean(post.pinned),
  },
  Comment: {
    post: async (comment: any) => {
      if (comment.post) {
        return mapPostForGraphQL(comment.post);
      }

      const post = await prisma.post.findUnique({
        where: { id: comment.postId },
        include: buildPostInclude(),
      });
      if (!post || post.deleted) {
        throw new Error("Post not found");
      }

      return mapPostForGraphQL(post);
    },
    author: (comment: any) => sanitizeAuthorIdentity(comment.author),
    parentId: (comment: any) => comment.parentId ?? null,
    parent: async (comment: any, _: unknown, ctx: GraphQLContext) => {
      if (!comment.parentId) {
        return null;
      }
      if (comment.parent) {
        return mapCommentForGraphQL(comment.parent, ctx.user?.sub);
      }

      const parentComment = await (prisma as any).comment.findUnique({
        where: { id: comment.parentId },
        include: buildCommentInclude(ctx.user?.sub),
      });
      if (!parentComment) {
        return null;
      }

      const hiddenCommentAuthorIds = await getPrivateCommentAuthorIds(
        ctx.user?.sub,
      );
      if (
        hiddenCommentAuthorIds.length > 0 &&
        hiddenCommentAuthorIds.includes(parentComment.authorId) &&
        parentComment.post?.authorId !== ctx.user?.sub
      ) {
        return null;
      }

      return mapCommentForGraphQL(parentComment, ctx.user?.sub);
    },
    replies: async (
      comment: { id: string },
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const safeLimit = Math.max(1, Math.min(limit, 100));
      const safeOffset = Math.max(0, offset);
      const hiddenCommentAuthorIds = await getPrivateCommentAuthorIds(viewerId);

      const replies = await (prisma as any).comment.findMany({
        where: {
          parentId: comment.id,
          ...(hiddenCommentAuthorIds.length > 0
            ? {
                OR: [
                  {
                    authorId: {
                      notIn: hiddenCommentAuthorIds,
                    },
                  },
                  ...(viewerId
                    ? [
                        {
                          post: {
                            authorId: viewerId,
                          },
                        },
                      ]
                    : []),
                ],
              }
            : {}),
        },
        include: buildCommentInclude(viewerId),
        orderBy: { createdAt: "asc" },
        take: safeLimit,
        skip: safeOffset,
      });

      return replies.map((reply: any) => mapCommentForGraphQL(reply, viewerId));
    },
    replyCount: (comment: any) =>
      comment.replyCount ?? comment?._count?.replies ?? 0,
    likeCount: (comment: any) =>
      comment.likeCount ?? comment?._count?.commentLikes ?? 0,
    viewerHasLiked: (comment: any) => Boolean(comment.viewerHasLiked),
  },
  PostVersion: {
    editor: (version: any) => sanitizeAuthorIdentity(version.editor),
  },
};
