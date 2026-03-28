import { prisma } from "../config/prisma";

export const NOTIFICATION_ICON = {
  COMMENT: "MessageText1",
  COMMENT_LIKE: "Like1",
  FOLLOW: "Profile2User",
  POST_LIKE: "Heart",
  SYSTEM: "Notification",
} as const;

type CreateNotificationInput = {
  userId: string;
  title: string;
  description: string;
  icon: string;
  profilePicture?: string | null;
  unread?: boolean;
};

export const createNotification = async ({
  userId,
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
      title: title.trim(),
      description: description.trim(),
      icon: icon.trim(),
      profilePicture: profilePicture?.trim() || null,
      unread,
    },
  });
};
