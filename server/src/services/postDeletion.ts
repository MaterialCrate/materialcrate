import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { s3 } from "../config/s3.js";

const POST_HARD_DELETE_AFTER_DAYS = 30;
const DEFAULT_PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

const extractS3Key = (fileUrl: string) => {
  try {
    const parsed = new URL(fileUrl);
    const key = parsed.pathname.replace(/^\/+/, "");
    return key ? decodeURIComponent(key) : null;
  } catch {
    return null;
  }
};

const bucketForKey = (key: string) =>
  key.startsWith("documents/")
    ? process.env.AWS_S3_PRIVATE_BUCKET
    : process.env.AWS_S3_PUBLIC_BUCKET;

const collectPostAssets = (post: {
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  versions?: Array<{
    fileUrl?: string | null;
    thumbnailUrl?: string | null;
  }>;
}): Array<{ key: string; bucket: string }> => {
  const urls = [
    post.fileUrl,
    post.thumbnailUrl,
    ...(post.versions ?? []).flatMap((v) => [v.fileUrl, v.thumbnailUrl]),
  ];

  const seen = new Set<string>();
  const assets: Array<{ key: string; bucket: string }> = [];

  for (const url of urls) {
    if (!url?.trim()) continue;
    const key = extractS3Key(url);
    if (!key || seen.has(key)) continue;
    const bucket = bucketForKey(key);
    if (!bucket) continue;
    seen.add(key);
    assets.push({ key, bucket });
  }

  return assets;
};

export const hardDeletePost = async (postId: string) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      fileUrl: true,
      thumbnailUrl: true,
      versions: { select: { fileUrl: true, thumbnailUrl: true } },
    },
  });

  if (!post) return;

  for (const { key, bucket } of collectPostAssets(post)) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      // best-effort S3 cleanup
    }
  }

  await prisma.post.delete({ where: { id: postId } });
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

  for (const post of expiredPosts) {
    const assets = collectPostAssets(post);

    for (const { key, bucket } of assets) {
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
