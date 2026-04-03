import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../../config/prisma.js";
import { s3 } from "../../config/s3.js";
import {
  createNotification,
  NOTIFICATION_ICON,
  NOTIFICATION_TYPE,
} from "../../services/notifications.js";
import { emitNotificationActivity } from "../../realtime/postActivity.js";

type GraphQLContext = {
  user?: {
    sub?: string;
  };
};

const PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS = 60 * 60;

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

const resolveNotificationProfilePicture = async (
  profilePicture?: string | null,
) => {
  const rawProfilePicture = profilePicture?.trim();
  if (!rawProfilePicture) {
    return null;
  }

  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) {
    return rawProfilePicture;
  }

  const key = extractS3KeyFromUrl(rawProfilePicture, bucket, region);
  if (!key) {
    return rawProfilePicture;
  }

  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn: PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS },
    );
  } catch {
    return rawProfilePicture;
  }
};

const toNotificationGraphQL = async (notification: any) => ({
  id: notification.id,
  type: notification.type ?? NOTIFICATION_TYPE.SYSTEM,
  actorId: notification.actorId ?? null,
  title: notification.title,
  description: notification.description,
  icon: notification.icon,
  profilePicture: await resolveNotificationProfilePicture(
    notification.profilePicture,
  ),
  unread: Boolean(notification.unread),
  time:
    notification.time instanceof Date
      ? notification.time.toISOString()
      : new Date(notification.time).toISOString(),
});

export const NotificationResolver = {
  Query: {
    notifications: async (
      _: unknown,
      {
        limit = 50,
        unreadOnly = false,
      }: { limit?: number; unreadOnly?: boolean },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const safeLimit = Number.isFinite(limit)
        ? Math.min(Math.max(limit, 1), 100)
        : 50;

      const notifications = await (prisma as any).notification.findMany({
        where: {
          userId: viewerId,
          ...(unreadOnly ? { unread: true } : {}),
        },
        orderBy: { time: "desc" },
        take: safeLimit,
      });

      return Promise.all(notifications.map(toNotificationGraphQL));
    },
  },
  Mutation: {
    createNotification: async (
      _: unknown,
      {
        title,
        description,
        icon,
        profilePicture,
        userId,
        type,
      }: {
        title: string;
        description: string;
        icon: string;
        profilePicture?: string;
        userId?: string;
        type?: string;
      },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const targetUserId = userId?.trim() || viewerId;
      const notification = await createNotification({
        userId: targetUserId,
        title,
        description,
        icon: icon?.trim() || NOTIFICATION_ICON.SYSTEM,
        profilePicture,
        type,
      });

      return toNotificationGraphQL(notification);
    },
    markNotificationRead: async (
      _: unknown,
      { notificationId }: { notificationId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedId = notificationId?.trim();
      if (!normalizedId) {
        throw new Error("notificationId is required");
      }

      const existing = await (prisma as any).notification.findUnique({
        where: { id: normalizedId },
        select: { id: true, userId: true },
      });

      if (!existing || existing.userId !== viewerId) {
        throw new Error("Notification not found");
      }

      const notification = await (prisma as any).notification.update({
        where: { id: normalizedId },
        data: { unread: false },
      });

      const unreadCount = await (prisma as any).notification.count({
        where: {
          userId: viewerId,
          unread: true,
        },
      });

      emitNotificationActivity({
        userId: viewerId,
        reason: "notification-read",
        notificationId: normalizedId,
        unreadCount,
      });

      return toNotificationGraphQL(notification);
    },
    markAllNotificationsRead: async (
      _: unknown,
      __: unknown,
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      await (prisma as any).notification.updateMany({
        where: {
          userId: viewerId,
          unread: true,
        },
        data: {
          unread: false,
        },
      });

      emitNotificationActivity({
        userId: viewerId,
        reason: "notifications-read-all",
        unreadCount: 0,
      });

      return true;
    },
  },
};
