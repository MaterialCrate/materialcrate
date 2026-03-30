import { prisma } from "../config/prisma";

export const NOTIFICATION_ICON = {
  COMMENT: "MessageText1",
  COMMENT_LIKE: "Like1",
  FOLLOW: "Profile2User",
  FOLLOW_REQUEST: "Profile2User",
  POST_LIKE: "Heart",
  SYSTEM: "Notification",
} as const;

export const NOTIFICATION_TYPE = {
  COMMENT: "COMMENT",
  COMMENT_LIKE: "COMMENT_LIKE",
  FOLLOW: "FOLLOW",
  FOLLOW_REQUEST: "FOLLOW_REQUEST",
  POST_LIKE: "POST_LIKE",
  SYSTEM: "SYSTEM",
} as const;

type CreateNotificationInput = {
  userId: string;
  actorId?: string | null;
  type?: string;
  title: string;
  description: string;
  icon: string;
  profilePicture?: string | null;
  unread?: boolean;
};

export const createNotification = async ({
  userId,
  actorId,
  type = NOTIFICATION_TYPE.SYSTEM,
  title,
  description,
  icon,
  profilePicture,
  unread = true,
}: CreateNotificationInput) => {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new Error("Notification userId is required");
  }

  return (prisma as any).notification.create({
    data: {
      userId: normalizedUserId,
      actorId: actorId?.trim() || null,
      type: type.trim() || NOTIFICATION_TYPE.SYSTEM,
      title: title.trim(),
      description: description.trim(),
      icon: icon.trim(),
      profilePicture: profilePicture?.trim() || null,
      unread,
    },
  });
};
