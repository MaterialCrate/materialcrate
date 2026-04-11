"use client";

import { io, type Socket } from "socket.io-client";

export type PostActivityEvent = {
  postId: string;
  reason: "post-like" | "comment-created" | "comment-like";
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
  reason:
    | "notification-created"
    | "notification-read"
    | "notifications-read-all";
  notificationId?: string;
  unreadCount?: number;
  emittedAt?: string;
};

export type FollowActivityEvent = {
  userId: string;
  reason: "followed" | "unfollowed" | "follow-request-accepted";
  actorId?: string | null;
  followersCount?: number;
  followingCount?: number;
  emittedAt?: string;
};

export type ChatMessageAttachment = {
  id: string;
  type: string;
  url?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
};

export type ChatMessageEvent = {
  conversationId: string;
  senderId: string;
  message: {
    id: string;
    text: string | null;
    timestamp: string;
    status: string | null;
    isUnsent: boolean;
    attachments: ChatMessageAttachment[];
  };
  emittedAt?: string;
};

export type ChatTypingEvent = {
  conversationId: string;
  senderId: string;
  isTyping: boolean;
  emittedAt?: string;
};

type SocketConfigResponse = {
  enabled?: boolean;
  socketUrl?: string | null;
  socketPath?: string | null;
};

type ActivityHandler = (event: PostActivityEvent) => void;
type NotificationActivityHandler = (event: NotificationActivityEvent) => void;
type FollowActivityHandler = (event: FollowActivityEvent) => void;
type ChatMessageHandler = (event: ChatMessageEvent) => void;
type ChatTypingHandler = (event: ChatTypingEvent) => void;

let socketPromise: Promise<Socket | null> | null = null;
const handlersByPostId = new Map<string, Set<ActivityHandler>>();
const watcherCountByPostId = new Map<string, number>();
const notificationHandlersByUserId = new Map<
  string,
  Set<NotificationActivityHandler>
>();
const notificationWatcherCountByUserId = new Map<string, number>();
const followHandlersByUserId = new Map<string, Set<FollowActivityHandler>>();
const followWatcherCountByUserId = new Map<string, number>();
const chatMessageHandlersByConvId = new Map<string, Set<ChatMessageHandler>>();
const chatTypingHandlersByConvId = new Map<string, Set<ChatTypingHandler>>();
const chatWatcherCountByConvId = new Map<string, number>();

const normalizePostId = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const normalizeUserId = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const broadcastActivity = (event: PostActivityEvent) => {
  const postId = normalizePostId(event.postId);
  if (!postId) {
    return;
  }

  const handlers = handlersByPostId.get(postId);
  if (!handlers?.size) {
    return;
  }

  handlers.forEach((handler) => {
    try {
      handler({ ...event, postId });
    } catch (error) {
      console.error("Failed to handle realtime post activity", error);
    }
  });
};

const broadcastNotificationActivity = (event: NotificationActivityEvent) => {
  const userId = normalizeUserId(event.userId);
  if (!userId) {
    return;
  }

  const handlers = notificationHandlersByUserId.get(userId);
  if (!handlers?.size) {
    return;
  }

  handlers.forEach((handler) => {
    try {
      handler({ ...event, userId });
    } catch (error) {
      console.error("Failed to handle realtime notification activity", error);
    }
  });
};

const broadcastChatMessage = (event: ChatMessageEvent) => {
  const convId = event.conversationId?.trim();
  if (!convId) return;
  chatMessageHandlersByConvId.get(convId)?.forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      console.error("Failed to handle realtime chat message", error);
    }
  });
};

const broadcastChatTyping = (event: ChatTypingEvent) => {
  const convId = event.conversationId?.trim();
  if (!convId) return;
  chatTypingHandlersByConvId.get(convId)?.forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      console.error("Failed to handle realtime chat typing", error);
    }
  });
};

const broadcastFollowActivity = (event: FollowActivityEvent) => {
  const userId = normalizeUserId(event.userId);
  if (!userId) {
    return;
  }

  const handlers = followHandlersByUserId.get(userId);
  if (!handlers?.size) {
    return;
  }

  handlers.forEach((handler) => {
    try {
      handler({ ...event, userId });
    } catch (error) {
      console.error("Failed to handle realtime follow activity", error);
    }
  });
};

const loadSocketConfig = async (): Promise<SocketConfigResponse | null> => {
  try {
    const response = await fetch("/api/realtime/socket-config", {
      method: "GET",
      cache: "no-store",
    });
    const body = (await response
      .json()
      .catch(() => ({}))) as SocketConfigResponse;

    if (!response.ok || !body?.enabled || !body.socketUrl) {
      return null;
    }

    return body;
  } catch (error) {
    console.error("Failed to load realtime socket config", error);
    return null;
  }
};

const ensureSocket = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!socketPromise) {
    socketPromise = (async () => {
      const config = await loadSocketConfig();
      if (!config?.socketUrl) {
        socketPromise = null;
        return null;
      }

      const socket = io(config.socketUrl, {
        path: config.socketPath?.trim() || "/socket.io",
        transports: ["websocket", "polling"],
        withCredentials: true,
        reconnectionAttempts: 5,
      });

      socket.on("post:activity", broadcastActivity);
      socket.on("notification:activity", broadcastNotificationActivity);
      socket.on("follow:activity", broadcastFollowActivity);
      socket.on("chat:message", broadcastChatMessage);
      socket.on("chat:typing", broadcastChatTyping);
      return socket;
    })();
  }

  return socketPromise;
};

export const subscribeToPostActivity = async (
  postId: string,
  handler: ActivityHandler,
) => {
  const normalizedPostId = normalizePostId(postId);
  if (!normalizedPostId) {
    return () => {};
  }

  const handlers =
    handlersByPostId.get(normalizedPostId) ?? new Set<ActivityHandler>();
  handlers.add(handler);
  handlersByPostId.set(normalizedPostId, handlers);

  const socket = await ensureSocket();
  if (socket) {
    const watcherCount = watcherCountByPostId.get(normalizedPostId) ?? 0;
    if (watcherCount === 0) {
      socket.emit("post:watch", normalizedPostId);
    }
    watcherCountByPostId.set(normalizedPostId, watcherCount + 1);
  }

  return () => {
    const currentHandlers = handlersByPostId.get(normalizedPostId);
    currentHandlers?.delete(handler);

    if (currentHandlers && currentHandlers.size === 0) {
      handlersByPostId.delete(normalizedPostId);
    }

    if (!socket) {
      return;
    }

    const nextWatcherCount =
      (watcherCountByPostId.get(normalizedPostId) ?? 1) - 1;
    if (nextWatcherCount <= 0) {
      watcherCountByPostId.delete(normalizedPostId);
      socket.emit("post:unwatch", normalizedPostId);
      return;
    }

    watcherCountByPostId.set(normalizedPostId, nextWatcherCount);
  };
};

export const subscribeToNotificationActivity = async (
  userId: string,
  handler: NotificationActivityHandler,
) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    return () => {};
  }

  const handlers =
    notificationHandlersByUserId.get(normalizedUserId) ??
    new Set<NotificationActivityHandler>();
  handlers.add(handler);
  notificationHandlersByUserId.set(normalizedUserId, handlers);

  const socket = await ensureSocket();
  if (socket) {
    const watcherCount =
      notificationWatcherCountByUserId.get(normalizedUserId) ?? 0;
    if (watcherCount === 0) {
      socket.emit("notification:watch", normalizedUserId);
    }
    notificationWatcherCountByUserId.set(normalizedUserId, watcherCount + 1);
  }

  return () => {
    const currentHandlers = notificationHandlersByUserId.get(normalizedUserId);
    currentHandlers?.delete(handler);

    if (currentHandlers && currentHandlers.size === 0) {
      notificationHandlersByUserId.delete(normalizedUserId);
    }

    if (!socket) {
      return;
    }

    const nextWatcherCount =
      (notificationWatcherCountByUserId.get(normalizedUserId) ?? 1) - 1;
    if (nextWatcherCount <= 0) {
      notificationWatcherCountByUserId.delete(normalizedUserId);
      socket.emit("notification:unwatch", normalizedUserId);
      return;
    }

    notificationWatcherCountByUserId.set(normalizedUserId, nextWatcherCount);
  };
};

export const subscribeToFollowActivity = async (
  userId: string,
  handler: FollowActivityHandler,
) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    return () => {};
  }

  const handlers =
    followHandlersByUserId.get(normalizedUserId) ??
    new Set<FollowActivityHandler>();
  handlers.add(handler);
  followHandlersByUserId.set(normalizedUserId, handlers);

  const socket = await ensureSocket();
  if (socket) {
    const watcherCount = followWatcherCountByUserId.get(normalizedUserId) ?? 0;
    if (watcherCount === 0) {
      socket.emit("follow:watch", normalizedUserId);
    }
    followWatcherCountByUserId.set(normalizedUserId, watcherCount + 1);
  }

  return () => {
    const currentHandlers = followHandlersByUserId.get(normalizedUserId);
    currentHandlers?.delete(handler);

    if (currentHandlers && currentHandlers.size === 0) {
      followHandlersByUserId.delete(normalizedUserId);
    }

    if (!socket) {
      return;
    }

    const nextWatcherCount =
      (followWatcherCountByUserId.get(normalizedUserId) ?? 1) - 1;
    if (nextWatcherCount <= 0) {
      followWatcherCountByUserId.delete(normalizedUserId);
      socket.emit("follow:unwatch", normalizedUserId);
      return;
    }

    followWatcherCountByUserId.set(normalizedUserId, nextWatcherCount);
  };
};

export const subscribeToChatMessages = async (
  conversationId: string,
  handler: ChatMessageHandler,
) => {
  const convId = conversationId.trim();
  if (!convId) return () => {};

  const handlers = chatMessageHandlersByConvId.get(convId) ?? new Set<ChatMessageHandler>();
  handlers.add(handler);
  chatMessageHandlersByConvId.set(convId, handlers);

  const socket = await ensureSocket();
  if (socket) {
    const watcherCount = chatWatcherCountByConvId.get(convId) ?? 0;
    if (watcherCount === 0) {
      socket.emit("chat:join", convId);
    }
    chatWatcherCountByConvId.set(convId, watcherCount + 1);
  }

  return () => {
    const currentHandlers = chatMessageHandlersByConvId.get(convId);
    currentHandlers?.delete(handler);
    if (currentHandlers?.size === 0) chatMessageHandlersByConvId.delete(convId);

    if (!socket) return;

    const nextWatcherCount = (chatWatcherCountByConvId.get(convId) ?? 1) - 1;
    if (nextWatcherCount <= 0) {
      chatWatcherCountByConvId.delete(convId);
      socket.emit("chat:leave", convId);
      return;
    }
    chatWatcherCountByConvId.set(convId, nextWatcherCount);
  };
};

export const subscribeToChatTyping = async (
  conversationId: string,
  handler: ChatTypingHandler,
) => {
  const convId = conversationId.trim();
  if (!convId) return () => {};

  const handlers = chatTypingHandlersByConvId.get(convId) ?? new Set<ChatTypingHandler>();
  handlers.add(handler);
  chatTypingHandlersByConvId.set(convId, handlers);

  // Typing events ride on the same chat room — no separate join needed.
  // The room is joined/left by subscribeToChatMessages.
  return () => {
    const currentHandlers = chatTypingHandlersByConvId.get(convId);
    currentHandlers?.delete(handler);
    if (currentHandlers?.size === 0) chatTypingHandlersByConvId.delete(convId);
  };
};

export const emitTyping = async (
  conversationId: string,
  senderId: string,
  isTyping: boolean,
) => {
  const socket = await ensureSocket();
  if (!socket) return;
  socket.emit("chat:typing", { conversationId, senderId, isTyping });
};
