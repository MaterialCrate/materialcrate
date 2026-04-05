import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../../config/prisma.js";
import { s3 } from "../../config/s3.js";

type AdminContext = {
  isAdmin?: boolean;
  user?: { sub?: string };
};

type CreateBotArgs = {
  username: string;
  displayName: string;
  institution?: string;
  program?: string;
  profilePicture?: string;
};

type CreatePostAsBotArgs = {
  botId: string;
  fileBase64: string;
  thumbnailBase64?: string;
  fileName: string;
  mimeType: string;
  title: string;
  categories: string[];
  description?: string;
  year?: number;
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

const buildS3FileUrl = (bucket: string, region: string, key: string) =>
  `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

const MAX_POST_THUMBNAIL_BYTES = 2 * 1024 * 1024;

function requireAdmin(ctx: AdminContext) {
  if (!ctx.isAdmin) {
    throw new Error("Not authorized");
  }
}

export const AdminResolver = {
  Query: {
    adminListBots: async (_: unknown, __: unknown, ctx: AdminContext) => {
      requireAdmin(ctx);
      return prisma.user.findMany({
        where: { isBot: true, deleted: false },
        orderBy: { createdAt: "desc" },
      });
    },
  },
  Mutation: {
    adminCreateBot: async (
      _: unknown,
      args: CreateBotArgs,
      ctx: AdminContext,
    ) => {
      requireAdmin(ctx);

      const username = args.username.trim();
      const displayName = args.displayName.trim();

      if (!username || !displayName) {
        throw new Error("Username and display name are required");
      }

      const existing = await (prisma as any).user.findFirst({
        where: {
          username: { equals: username, mode: "insensitive" },
          deleted: false,
        },
      });

      if (existing) {
        throw new Error("Username already in use");
      }

      const placeholderPassword = await bcrypt.hash(randomUUID(), 12);
      const profilePicture =
        args.profilePicture ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

      const bot = await prisma.user.create({
        data: {
          username,
          displayName,
          email: `bot-${username.toLowerCase()}@materialcrate.bot`,
          password: placeholderPassword,
          isBot: true,
          emailVerified: true,
          institution: args.institution ?? null,
          program: args.program ?? null,
          profilePicture,
          workspace: { create: { name: "My Workspace" } },
        } as any,
      });

      return bot;
    },

    adminCreatePostAsBot: async (
      _: unknown,
      args: CreatePostAsBotArgs,
      ctx: AdminContext,
    ) => {
      requireAdmin(ctx);

      const bot = await prisma.user.findUnique({
        where: { id: args.botId },
        select: { id: true, isBot: true, deleted: true },
      });

      if (!bot || !bot.isBot || bot.deleted) {
        throw new Error("Bot not found");
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

      if (!fileBase64 || !fileName || !mimeType || !title) {
        throw new Error("Missing required post fields");
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
            const thumbnailKey = `thumbnails/${Date.now()}-${randomUUID()}-${sanitizeFileName(thumbnailBaseName)}.webp`;

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

      const normalizedCategories = categories
        .map((c) => (typeof c === "string" ? c.trim() : ""))
        .filter(Boolean)
        .map((c) => c.toLowerCase());

      if (normalizedCategories.length < 1 || normalizedCategories.length > 3) {
        throw new Error("Posts must have between 1 and 3 categories");
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
            authorId: bot.id,
          },
        });

        await (tx as any).postVersion.create({
          data: {
            postId: nextPost.id,
            versionNumber: 1,
            title: nextPost.title,
            categories: nextPost.categories,
            description: nextPost.description,
            year: nextPost.year,
            fileUrl: nextPost.fileUrl,
            thumbnailUrl: nextPost.thumbnailUrl,
            editorId: bot.id,
          },
        });

        return tx.post.findUnique({
          where: { id: nextPost.id },
          include: {
            author: true,
            likes: true,
            comments: true,
            _count: { select: { likes: true, comments: true } },
          },
        });
      });

      if (!createdPost) {
        throw new Error("Failed to create post");
      }

      return {
        ...createdPost,
        likeCount: createdPost._count?.likes ?? 0,
        commentCount: createdPost._count?.comments ?? 0,
        viewerHasLiked: false,
      };
    },
  },
};
