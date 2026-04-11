import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma.js";
import { s3 } from "../../config/s3.js";

type GraphQLContext = {
  user?: {
    sub?: string;
  };
};

const VALID_CATEGORIES = new Set([
  "bug",
  "crash",
  "performance",
  "account",
  "content",
  "other",
]);

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

const buildCloudFrontUrl = (key: string) =>
  `${(process.env.CLOUDFRONT_URL ?? "").replace(/\/$/, "")}/${key}`;

export const ReportResolver = {
  Query: {
    myReports: async (
      _: unknown,
      args: { limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const userId = ctx.user?.sub;
      if (!userId) throw new Error("Authentication required.");

      const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
      const offset = Math.max(args.offset ?? 0, 0);

      const reports = await prisma.report.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });

      return reports.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }));
    },
  },

  Mutation: {
    createReport: async (
      _: unknown,
      args: {
        category: string;
        title: string;
        description: string;
        userAgent?: string;
        deviceInfo?: string;
        imageBase64s?: string[];
        imageFileNames?: string[];
        imageMimeTypes?: string[];
      },
      ctx: GraphQLContext,
    ) => {
      const userId = ctx.user?.sub;
      if (!userId) throw new Error("Authentication required.");

      const category = args.category.trim().toLowerCase();
      if (!VALID_CATEGORIES.has(category)) {
        throw new Error("Invalid report category.");
      }

      const title = args.title.trim();
      if (title.length < 5 || title.length > MAX_TITLE_LENGTH) {
        throw new Error(
          `Title must be between 5 and ${MAX_TITLE_LENGTH} characters.`,
        );
      }

      const description = args.description.trim();
      if (
        description.length < 20 ||
        description.length > MAX_DESCRIPTION_LENGTH
      ) {
        throw new Error(
          `Description must be between 20 and ${MAX_DESCRIPTION_LENGTH} characters.`,
        );
      }

      const imageBase64s = args.imageBase64s ?? [];
      const imageFileNames = args.imageFileNames ?? [];
      const imageMimeTypes = args.imageMimeTypes ?? [];

      if (imageBase64s.length > MAX_IMAGES) {
        throw new Error(`You can attach up to ${MAX_IMAGES} images.`);
      }

      if (
        imageBase64s.length !== imageFileNames.length ||
        imageBase64s.length !== imageMimeTypes.length
      ) {
        throw new Error("Image data arrays must be the same length.");
      }

      const publicBucket = process.env.AWS_S3_PUBLIC_BUCKET;
      const uploadedImageUrls: string[] = [];

      if (imageBase64s.length > 0) {
        if (!publicBucket) {
          throw new Error("File storage is not configured.");
        }

        for (let i = 0; i < imageBase64s.length; i++) {
          const base64 = imageBase64s[i];
          const fileName = imageFileNames[i];
          const mimeType = imageMimeTypes[i].toLowerCase();

          if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
            throw new Error("Only JPEG, PNG, and WebP images are supported.");
          }

          const buffer = Buffer.from(base64, "base64");

          if (buffer.byteLength > MAX_IMAGE_BYTES) {
            throw new Error("Each image must be under 5 MB.");
          }

          const sanitizedName = sanitizeFileName(fileName);
          const key = `reports/${userId}/${Date.now()}-${randomUUID()}-${sanitizedName}`;

          await s3.send(
            new PutObjectCommand({
              Bucket: publicBucket,
              Key: key,
              Body: buffer,
              ContentType: mimeType,
            }),
          );

          uploadedImageUrls.push(buildCloudFrontUrl(key));
        }
      }

      const report = await prisma.report.create({
        data: {
          userId,
          category,
          title,
          description,
          imageUrls: uploadedImageUrls,
          userAgent: args.userAgent?.slice(0, 500) ?? null,
          deviceInfo: args.deviceInfo?.slice(0, 500) ?? null,
        },
      });

      return {
        ...report,
        createdAt: report.createdAt.toISOString(),
      };
    },
  },
};
