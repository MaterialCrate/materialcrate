import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../../config/prisma";
import { s3 } from "../../config/s3";

type CreatePostArgs = {
  fileBase64: string;
  thumbnailBase64?: string;
  fileName: string;
  mimeType: string;
  title: string;
  courseCode: string;
  description?: string;
  year?: number;
};

type GraphQLContext = {
  user?: {
    sub?: string;
  };
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

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
      displayName: "Deleted User",
      username: "deleted",
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
    post: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const normalizedId = id?.trim();
      if (!normalizedId) {
        throw new Error("Post id is required");
      }

      const post = await prisma.post.findUnique({
        where: { id: normalizedId },
        include: buildPostInclude(viewerId),
      });

      return post ? mapPostForGraphQL(post, viewerId) : null;
    },
    posts: async (
      _: unknown,
      { authorUsername }: { authorUsername?: string | null },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const normalizedAuthorUsername = String(authorUsername || "").trim();
      const posts = await prisma.post.findMany({
        where: normalizedAuthorUsername
          ? {
              author: {
                username: {
                  equals: normalizedAuthorUsername,
                  mode: "insensitive",
                },
                deleted: false,
                disabled: false,
              },
            }
          : undefined,
        include: buildPostInclude(viewerId),
        orderBy: {
          createdAt: "desc",
        },
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

      const posts = await prisma.post.findMany({
        where: {
          OR: [
            {
              title: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              courseCode: {
                contains: normalizedQuery,
                mode: "insensitive",
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

      const comments = await (prisma as any).comment.findMany({
        where: { postId, parentId: parentCommentId },
        include: buildCommentInclude(viewerId),
        orderBy: { createdAt: "desc" },
        take: safeLimit,
        skip: safeOffset,
      });

      return comments.map((comment: any) => mapCommentForGraphQL(comment, viewerId));
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
        courseCode,
        description,
        year,
      } = args;

      if (!fileBase64 || !fileName || !mimeType || !title || !courseCode) {
        throw new Error("Missing required post fields");
      }

      const normalizedMime = mimeType.toLowerCase();
      const normalizedName = fileName.toLowerCase();
      const isPdf = normalizedMime === "application/pdf" || normalizedName.endsWith(".pdf");
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

      return prisma.post.create({
        data: {
          fileUrl,
          thumbnailUrl,
          title: title.trim(),
          courseCode: courseCode.trim(),
          description: description?.trim() || null,
          year: Number.isFinite(year) ? year : null,
          authorId: ctx.user.sub,
        },
        include: buildPostInclude(ctx.user.sub),
      });
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
        select: { id: true },
      });
      if (!post) {
        throw new Error("Post not found");
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
      } else {
        await prisma.like.create({
          data: {
            userId: viewerId,
            postId,
          },
        });
      }

      const updatedPost = await prisma.post.findUnique({
        where: { id: postId },
        include: buildPostInclude(viewerId),
      });
      if (!updatedPost) {
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
        select: { id: true },
      });
      if (!post) {
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
        select: { id: true },
      });
      if (!comment) {
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
      } else {
        await (prisma as any).commentLike.create({
          data: {
            userId: viewerId,
            commentId,
          },
        });
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
    commentCount: (post: any) => post.commentCount ?? post?._count?.comments ?? 0,
    comments: async (
      post: { id: string },
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const safeLimit = Math.max(1, Math.min(limit, 100));
      const safeOffset = Math.max(0, offset);

      const comments = await (prisma as any).comment.findMany({
        where: { postId: post.id, parentId: null },
        include: buildCommentInclude(viewerId),
        orderBy: { createdAt: "desc" },
        take: safeLimit,
        skip: safeOffset,
      });

      return comments.map((comment: any) => mapCommentForGraphQL(comment, viewerId));
    },
    viewerHasLiked: (post: any) => Boolean(post.viewerHasLiked),
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
      if (!post) {
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

      const replies = await (prisma as any).comment.findMany({
        where: { parentId: comment.id },
        include: buildCommentInclude(viewerId),
        orderBy: { createdAt: "asc" },
        take: safeLimit,
        skip: safeOffset,
      });

      return replies.map((reply: any) => mapCommentForGraphQL(reply, viewerId));
    },
    replyCount: (comment: any) => comment.replyCount ?? comment?._count?.replies ?? 0,
    likeCount: (comment: any) =>
      comment.likeCount ?? comment?._count?.commentLikes ?? 0,
    viewerHasLiked: (comment: any) => Boolean(comment.viewerHasLiked),
  },
};
