import { prisma } from "../config/prisma.js";

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

const PUSH_NOTIFICATION_TYPE_TO_PREF: Record<string, string> = {
  [NOTIFICATION_TYPE.POST_LIKE]: "pushNotificationsLikes",
  [NOTIFICATION_TYPE.COMMENT_LIKE]: "pushNotificationsLikes",
  [NOTIFICATION_TYPE.COMMENT]: "pushNotificationsComments",
  [NOTIFICATION_TYPE.FOLLOW]: "pushNotificationsFollows",
  [NOTIFICATION_TYPE.FOLLOW_REQUEST]: "pushNotificationsFollows",
};

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

  const normalizedType = type.trim() || NOTIFICATION_TYPE.SYSTEM;

  return (prisma as any).notification.create({
    data: {
      userId: normalizedUserId,
      actorId: actorId?.trim() || null,
      type: normalizedType,
      title: title.trim(),
      description: description.trim(),
      icon: icon.trim(),
      profilePicture: profilePicture?.trim() || null,
      unread,
    },
  });
};

export const shouldSendPushNotification = async (
  userId: string,
  type: string,
): Promise<boolean> => {
  const prefField = PUSH_NOTIFICATION_TYPE_TO_PREF[type];
  if (!prefField) return true;

  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { [prefField]: true },
  });

  return !user || user[prefField] !== false;
};
