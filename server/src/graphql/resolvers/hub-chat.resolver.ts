import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { checkAchievements } from "../../achievements/service.js";

type GraphQLContext = {
  user?: {
    sub?: string;
  };
};

type HubChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

const MAX_MESSAGES_PER_CHAT = 60;
const MAX_MESSAGE_LENGTH = 8000;

const createMessageId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeHubChatMessages = (messages: unknown): HubChatMessage[] => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .flatMap((message) => {
      const text =
        typeof message === "object" && message && "text" in message
          ? String(message.text ?? "").trim()
          : "";

      if (!text) {
        return [];
      }

      const rawCreatedAt =
        typeof message === "object" && message && "createdAt" in message
          ? String(message.createdAt ?? "")
          : "";
      const parsedCreatedAt = new Date(rawCreatedAt);

      const role: HubChatMessage["role"] =
        typeof message === "object" &&
        message &&
        "role" in message &&
        message.role === "assistant"
          ? "assistant"
          : "user";

      return [
        {
          id:
            typeof message === "object" && message && "id" in message
              ? String(message.id ?? "").trim() || createMessageId()
              : createMessageId(),
          role,
          text: text.slice(0, MAX_MESSAGE_LENGTH),
          createdAt: Number.isNaN(parsedCreatedAt.getTime())
            ? new Date().toISOString()
            : parsedCreatedAt.toISOString(),
        },
      ];
    })
    .slice(-MAX_MESSAGES_PER_CHAT);
};

const mapHubChatForGraphQL = (chat: any) => ({
  ...chat,
  messages: normalizeHubChatMessages(chat?.messages),
});

const requireViewerId = (ctx: GraphQLContext) => {
  const viewerId = ctx.user?.sub?.trim();
  if (!viewerId) {
    throw new Error("Not authenticated");
  }

  return viewerId;
};

const ensureActivePost = async (postId: string) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, deleted: true },
  });

  if (!post || post.deleted) {
    throw new Error("Post not found");
  }
};

export const HubChatResolver = {
  Query: {
    myHubChats: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const viewerId = requireViewerId(ctx);

      const chats = await (prisma as any).hubChat.findMany({
        where: {
          userId: viewerId,
          post: {
            deleted: false,
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return chats.map((chat: any) => mapHubChatForGraphQL(chat));
    },
    myHubChat: async (
      _: unknown,
      { postId }: { postId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = requireViewerId(ctx);
      const normalizedPostId = postId?.trim();

      if (!normalizedPostId) {
        throw new Error("postId is required");
      }

      const chat = await (prisma as any).hubChat.findFirst({
        where: {
          userId: viewerId,
          postId: normalizedPostId,
          post: {
            deleted: false,
          },
        },
      });

      return chat ? mapHubChatForGraphQL(chat) : null;
    },
  },
  Mutation: {
    upsertHubChat: async (
      _: unknown,
      {
        postId,
        savedPostId,
        documentTitle,
        messages,
      }: {
        postId: string;
        savedPostId?: string | null;
        documentTitle: string;
        messages: HubChatMessage[];
      },
      ctx: GraphQLContext,
    ) => {
      const viewerId = requireViewerId(ctx);
      const normalizedPostId = postId?.trim();

      if (!normalizedPostId) {
        throw new Error("postId is required");
      }

      const normalizedTitle = documentTitle?.trim() || "Untitled document";
      const normalizedMessages = normalizeHubChatMessages(messages);

      if (normalizedMessages.length === 0) {
        throw new Error("messages must include at least one item");
      }

      await ensureActivePost(normalizedPostId);

      const chat = await (prisma as any).hubChat.upsert({
        where: {
          userId_postId: {
            userId: viewerId,
            postId: normalizedPostId,
          },
        },
        create: {
          userId: viewerId,
          postId: normalizedPostId,
          savedPostId: savedPostId?.trim() || null,
          documentTitle: normalizedTitle.slice(0, 200),
          messages: normalizedMessages as unknown as Prisma.InputJsonArray,
        },
        update: {
          savedPostId: savedPostId?.trim() || null,
          documentTitle: normalizedTitle.slice(0, 200),
          messages: normalizedMessages as unknown as Prisma.InputJsonArray,
        },
      });

      checkAchievements(viewerId, "ai_used").catch(() => null);
      return mapHubChatForGraphQL(chat);
    },
    clearHubChat: async (
      _: unknown,
      { chatId }: { chatId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = requireViewerId(ctx);
      const normalizedChatId = chatId?.trim();

      if (!normalizedChatId) {
        throw new Error("chatId is required");
      }

      const deleted = await (prisma as any).hubChat.deleteMany({
        where: {
          id: normalizedChatId,
          userId: viewerId,
        },
      });

      return deleted.count > 0;
    },
  },
  HubChat: {
    messages: (chat: any) => normalizeHubChatMessages(chat?.messages),
  },
};
