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

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

const buildS3FileUrl = (bucket: string, region: string, key: string) =>
  `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

export const PostResolver = {
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
      });
    },
  },
};
