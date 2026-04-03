import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";

type PostActivityReason = "post-like" | "comment-created" | "comment-like";
type NotificationActivityReason =
  | "notification-created"
  | "notification-read"
  | "notifications-read-all";
type FollowActivityReason =
  | "followed"
  | "unfollowed"
  | "follow-request-accepted";

export type PostActivityEvent = {
  postId: string;
  reason: PostActivityReason;
  postLikeCount?: number;
  commentCount?: number;
  commentId?: string;
  parentCommentId?: string | null;
  commentLikeCount?: number;
  replyCount?: number;
  emittedAt?: string;
};

export type NotificationActivityEvent = {
  userId: string;
  reason: NotificationActivityReason;
  notificationId?: string;
  unreadCount?: number;
  emittedAt?: string;
};

export type FollowActivityEvent = {
  userId: string;
  reason: FollowActivityReason;
  actorId?: string | null;
  followersCount?: number;
  followingCount?: number;
  emittedAt?: string;
};

const POST_ACTIVITY_SOCKET_PATH = "/socket.io";
const EMIT_DEBOUNCE_MS = 900;

let io: SocketIOServer | null = null;
const pendingPostEvents = new Map<
  string,
  {
    timer: NodeJS.Timeout;
    event: PostActivityEvent;
  }
>();
const pendingNotificationEvents = new Map<
  string,
  {
    timer: NodeJS.Timeout;
    event: NotificationActivityEvent;
  }
>();
const pendingFollowEvents = new Map<
  string,
  {
    timer: NodeJS.Timeout;
    event: FollowActivityEvent;
  }
>();

const normalizePostId = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const normalizeUserId = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getPostRoomName = (postId: string) => `post:${postId}`;
const getNotificationRoomName = (userId: string) => `notifications:${userId}`;
const getFollowRoomName = (userId: string) => `follow:${userId}`;

export const registerPostActivityRealtime = (httpServer: HttpServer) => {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    path: POST_ACTIVITY_SOCKET_PATH,
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    socket.on("post:watch", (incomingPostId: unknown) => {
      const postId = normalizePostId(incomingPostId);
      if (!postId) {
        return;
      }

      socket.join(getPostRoomName(postId));
    });

    socket.on("post:unwatch", (incomingPostId: unknown) => {
      const postId = normalizePostId(incomingPostId);
      if (!postId) {
        return;
      }

      socket.leave(getPostRoomName(postId));
    });

    socket.on("notification:watch", (incomingUserId: unknown) => {
      const userId = normalizeUserId(incomingUserId);
      if (!userId) {
        return;
      }

      socket.join(getNotificationRoomName(userId));
    });

    socket.on("notification:unwatch", (incomingUserId: unknown) => {
      const userId = normalizeUserId(incomingUserId);
      if (!userId) {
        return;
      }

      socket.leave(getNotificationRoomName(userId));
    });

    socket.on("follow:watch", (incomingUserId: unknown) => {
      const userId = normalizeUserId(incomingUserId);
      if (!userId) {
        return;
      }

      socket.join(getFollowRoomName(userId));
    });

    socket.on("follow:unwatch", (incomingUserId: unknown) => {
      const userId = normalizeUserId(incomingUserId);
      if (!userId) {
        return;
      }

      socket.leave(getFollowRoomName(userId));
    });
  });

  return io;
};

export const emitPostActivity = (event: PostActivityEvent) => {
  const postId = normalizePostId(event.postId);
  if (!io || !postId) {
    return;
  }

  const existing = pendingPostEvents.get(postId);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const mergedEvent: PostActivityEvent = {
    ...(existing?.event ?? { postId }),
    ...event,
    postId,
    emittedAt: new Date().toISOString(),
  };

  const timer = setTimeout(() => {
    io?.to(getPostRoomName(postId)).emit("post:activity", mergedEvent);
    pendingPostEvents.delete(postId);
  }, EMIT_DEBOUNCE_MS);

  pendingPostEvents.set(postId, {
    timer,
    event: mergedEvent,
  });
};

export const emitNotificationActivity = (event: NotificationActivityEvent) => {
  const userId = normalizeUserId(event.userId);
  if (!io || !userId) {
    return;
  }

  const existing = pendingNotificationEvents.get(userId);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const mergedEvent: NotificationActivityEvent = {
    ...(existing?.event ?? { userId }),
    ...event,
    userId,
    emittedAt: new Date().toISOString(),
  };

  const timer = setTimeout(() => {
    io?.to(getNotificationRoomName(userId)).emit(
      "notification:activity",
      mergedEvent,
    );
    pendingNotificationEvents.delete(userId);
  }, EMIT_DEBOUNCE_MS);

  pendingNotificationEvents.set(userId, {
    timer,
    event: mergedEvent,
  });
};

export const emitFollowActivity = (event: FollowActivityEvent) => {
  const userId = normalizeUserId(event.userId);
  if (!io || !userId) {
    return;
  }

  const existing = pendingFollowEvents.get(userId);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const mergedEvent: FollowActivityEvent = {
    ...(existing?.event ?? { userId }),
    ...event,
    userId,
    emittedAt: new Date().toISOString(),
  };

  const timer = setTimeout(() => {
    io?.to(getFollowRoomName(userId)).emit("follow:activity", mergedEvent);
    pendingFollowEvents.delete(userId);
  }, EMIT_DEBOUNCE_MS);

  pendingFollowEvents.set(userId, {
    timer,
    event: mergedEvent,
  });
};

export { POST_ACTIVITY_SOCKET_PATH };
