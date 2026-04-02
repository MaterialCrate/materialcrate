import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { s3 } from "../config/s3.js";

const POST_HARD_DELETE_AFTER_DAYS = 30;
const DEFAULT_PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

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

const collectPostAssetKeys = (
  post: {
    fileUrl?: string | null;
    thumbnailUrl?: string | null;
    versions?: Array<{
      fileUrl?: string | null;
      thumbnailUrl?: string | null;
    }>;
  },
  bucket: string,
  region: string,
) => {
  const urls = [
    post.fileUrl,
    post.thumbnailUrl,
    ...(post.versions ?? []).flatMap((version) => [
      version.fileUrl,
      version.thumbnailUrl,
    ]),
  ];

  return Array.from(
    new Set(
      urls
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => extractS3KeyFromUrl(value, bucket, region))
        .filter((value): value is string => Boolean(value)),
    ),
  );
};

export const purgeExpiredDeletedPosts = async () => {
  const cutoff = new Date(
    Date.now() - POST_HARD_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000,
  );

  let expiredPosts: Array<{
    id: string;
    fileUrl: string;
    thumbnailUrl: string | null;
    versions: Array<{
      fileUrl: string;
      thumbnailUrl: string | null;
    }>;
  }> = [];

  try {
    expiredPosts = await prisma.post.findMany({
      where: {
        deleted: true,
        deletedAt: {
          lte: cutoff,
        },
      },
      select: {
        id: true,
        fileUrl: true,
        thumbnailUrl: true,
        versions: {
          select: {
            fileUrl: true,
            thumbnailUrl: true,
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2022" &&
      typeof error.meta?.column === "string" &&
      error.meta.column.includes("Post.deleted")
    ) {
      console.warn(
        "Skipping deleted-post purge because the Post soft-delete migration has not been applied yet.",
      );
      return { purgedCount: 0, skipped: true };
    }

    throw error;
  }

  if (expiredPosts.length === 0) {
    return { purgedCount: 0 };
  }

  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;

  for (const post of expiredPosts) {
    if (bucket && region) {
      const keys = collectPostAssetKeys(post, bucket, region);

      for (const key of keys) {
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: key,
            }),
          );
        } catch (error) {
          console.error(`Failed to delete S3 object for post ${post.id}:`, error);
        }
      }
    }

    await prisma.post.delete({
      where: { id: post.id },
    });
  }

  return { purgedCount: expiredPosts.length };
};

export const startDeletedPostPurgeLoop = () => {
  let isRunning = false;

  const run = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    try {
      const result = await purgeExpiredDeletedPosts();
      if (result.purgedCount > 0) {
        console.log(`Purged ${result.purgedCount} expired deleted posts`);
      }
    } catch (error) {
      console.error("Failed to purge expired deleted posts:", error);
    } finally {
      isRunning = false;
    }
  };

  void run();

  const configuredInterval = Number(process.env.POST_PURGE_INTERVAL_MS);
  const intervalMs =
    Number.isFinite(configuredInterval) && configuredInterval > 0
      ? configuredInterval
      : DEFAULT_PURGE_INTERVAL_MS;

  const timer = setInterval(() => {
    void run();
  }, intervalMs);

  timer.unref?.();
};
