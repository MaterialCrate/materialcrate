import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../../config/prisma";
import { s3 } from "../../config/s3";

type CreatePostArgs = {
  fileBase64: string;
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
    posts: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const viewerId = ctx.user?.sub;
      const posts = await prisma.post.findMany({
        include: buildPostInclude(viewerId),
        orderBy: {
          createdAt: "desc",
        },
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

      const { fileBase64, fileName, mimeType, title, courseCode, description, year } = args;

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

      return prisma.post.create({
        data: {
          fileUrl,
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
