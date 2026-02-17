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
  viewerHasLiked: viewerId ? (post?.likes?.length ?? 0) > 0 : false,
});

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
  },
  Post: {
    likeCount: (post: any) => post.likeCount ?? post?._count?.likes ?? 0,
    viewerHasLiked: (post: any) => Boolean(post.viewerHasLiked),
  },
};
