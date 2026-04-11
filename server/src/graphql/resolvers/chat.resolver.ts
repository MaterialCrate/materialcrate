import { prisma } from "../../config/prisma.js";

type GraphQLContext = {
  user?: { sub?: string };
};

type AttachmentInput = {
  type: string;
  postId?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Sort two user IDs so participantAId is always lexicographically smaller,
// guaranteeing one Conversation row per pair regardless of who initiates.
function sortParticipants(
  a: string,
  b: string,
): { participantAId: string; participantBId: string } {
  return a < b
    ? { participantAId: a, participantBId: b }
    : { participantAId: b, participantBId: a };
}

function toISOString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

// Shape a raw attachment row into a GraphQL-ready object
function formatAttachment(att: any) {
  return {
    id: att.id,
    type: att.type,
    url: att.url ?? null,
    fileName: att.fileName ?? null,
    fileSize: att.fileSize ?? null,
    post: att.post
      ? {
          id: att.post.id,
          title: att.post.title,
          thumbnailUrl: att.post.thumbnailUrl ?? null,
          categories: att.post.categories ?? [],
          authorUsername: att.post.author?.username ?? null,
        }
      : null,
  };
}

// Shape a raw edit row
function formatEdit(edit: any) {
  return {
    id: edit.id,
    previousText: edit.previousText,
    editedAt: toISOString(edit.editedAt),
  };
}

// Build the ReplyPreview for a parent message
function buildReplyPreview(
  parent: any,
  viewerId: string,
  parentSenderName: string,
): object | null {
  if (!parent) return null;
  return {
    id: parent.id,
    text: parent.isUnsent ? null : (parent.text ?? null),
    isUnsent: Boolean(parent.isUnsent),
    senderName: parentSenderName,
    sentByMe: parent.senderId === viewerId,
    attachmentType:
      !parent.isUnsent && parent.attachments?.[0]
        ? parent.attachments[0].type
        : null,
  };
}

// Shape a raw ChatMessage row into the GraphQL type
function formatMessage(msg: any, viewerId: string, parentSenderName: string | null) {
  const isUnsent = Boolean(msg.isUnsent);
  return {
    id: msg.id,
    text: isUnsent ? null : (msg.text ?? null),
    sentByMe: msg.senderId === viewerId,
    timestamp: toISOString(msg.createdAt),
    status: msg.senderId === viewerId ? msg.status : null,
    isUnsent,
    editedAt: msg.editedAt ? toISOString(msg.editedAt) : null,
    replyTo:
      msg.parent && parentSenderName !== null
        ? buildReplyPreview(msg.parent, viewerId, parentSenderName)
        : null,
    attachments: isUnsent ? [] : (msg.attachments ?? []).map(formatAttachment),
    editHistory: isUnsent ? [] : (msg.edits ?? []).map(formatEdit),
  };
}

const POST_ATTACHMENT_INCLUDE = {
  select: {
    id: true,
    title: true,
    thumbnailUrl: true,
    categories: true,
    author: { select: { username: true } },
  },
};

const MESSAGE_INCLUDE = {
  attachments: {
    include: { post: POST_ATTACHMENT_INCLUDE },
    orderBy: { createdAt: "asc" as const },
  },
  edits: {
    orderBy: { editedAt: "asc" as const },
  },
  parent: {
    select: {
      id: true,
      text: true,
      isUnsent: true,
      senderId: true,
      attachments: {
        select: { type: true },
        take: 1,
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
};

// Resolve display names for parent message senders in a batch
async function resolveParentSenderNames(
  messages: any[],
  viewerId: string,
): Promise<Map<string, string>> {
  const parentSenderIds = new Set<string>();
  for (const msg of messages) {
    if (msg.parent?.senderId && msg.parent.senderId !== viewerId) {
      parentSenderIds.add(msg.parent.senderId);
    }
  }
  if (!parentSenderIds.size) return new Map();

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(parentSenderIds) } },
    select: { id: true, displayName: true },
  });
  return new Map(users.map((u: any) => [u.id, u.displayName]));
}

// Validate the viewer is a participant; throws if not
async function assertParticipant(conversationId: string, viewerId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participantAId: true, participantBId: true },
  });
  if (!conv || (conv.participantAId !== viewerId && conv.participantBId !== viewerId)) {
    throw new Error("Conversation not found");
  }
  return conv;
}

// ─── Conversation helpers ─────────────────────────────────────────────────────

async function getOtherParticipant(
  conv: { participantAId: string; participantBId: string },
  viewerId: string,
) {
  const otherId =
    conv.participantAId === viewerId ? conv.participantBId : conv.participantAId;

  const user = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, displayName: true, username: true, profilePicture: true },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.displayName,
    username: user.username,
    avatar: user.profilePicture ?? null,
    isOnline: false, // wired up via Socket.io presence separately
  };
}

async function toConversationGraphQL(
  conv: any,
  viewerId: string,
  lastMessage: any | null,
  unreadCount: number,
) {
  const participant = await getOtherParticipant(conv, viewerId);
  if (!participant) return null;

  // Derive a text preview for the last message
  let lastMessageText: string | null = null;
  if (lastMessage && !lastMessage.isUnsent) {
    if (lastMessage.text) {
      lastMessageText = lastMessage.text;
    } else if (lastMessage._count?.attachments > 0) {
      lastMessageText = "Attachment";
    }
  } else if (lastMessage?.isUnsent) {
    lastMessageText = null; // unsent — show nothing
  }

  return {
    id: conv.id,
    participant,
    lastMessage: lastMessageText,
    lastMessageTime: lastMessage ? toISOString(lastMessage.createdAt) : null,
    lastMessageSentByMe: lastMessage ? lastMessage.senderId === viewerId : false,
    lastMessageIsRead: lastMessage ? lastMessage.status === "READ" : true,
    unreadCount,
    updatedAt: toISOString(conv.updatedAt),
  };
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

export const ChatResolver = {
  Query: {
    conversations: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) throw new Error("Not authenticated");

      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [{ participantAId: viewerId }, { participantBId: viewerId }],
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!conversations.length) return [];

      const conversationIds = (conversations as any[]).map((c) => c.id);

      // Fetch the latest message per conversation in one round-trip
      const lastMessages = await prisma.chatMessage.findMany({
        where: { conversationId: { in: conversationIds } },
        orderBy: { createdAt: "desc" },
        distinct: ["conversationId"],
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          text: true,
          isUnsent: true,
          status: true,
          createdAt: true,
          _count: { select: { attachments: true } },
        },
      });

      // Count unread messages per conversation (from the other person, not yet READ)
      const unreadCounts = await prisma.chatMessage.groupBy({
        by: ["conversationId"],
        where: {
          conversationId: { in: conversationIds },
          senderId: { not: viewerId },
          status: { not: "READ" },
          isUnsent: false,
        },
        _count: { id: true },
      });

      const lastMsgByConvId = new Map(
        (lastMessages as any[]).map((m) => [m.conversationId, m]),
      );
      const unreadByConvId = new Map(
        (unreadCounts as any[]).map((r) => [r.conversationId, r._count.id]),
      );

      const results = await Promise.all(
        (conversations as any[]).map((conv) =>
          toConversationGraphQL(
            conv,
            viewerId,
            lastMsgByConvId.get(conv.id) ?? null,
            unreadByConvId.get(conv.id) ?? 0,
          ),
        ),
      );

      return results.filter(Boolean);
    },

    chatUserSuggestions: async (
      _: unknown,
      { query }: { query?: string | null },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) throw new Error("Not authenticated");

      const q = query?.trim() || null;
      const nameFilter = q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" as const } },
              { displayName: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {};

      // 1. Recent conversation partners (most recent first)
      const convs = await prisma.conversation.findMany({
        where: {
          OR: [{ participantAId: viewerId }, { participantBId: viewerId }],
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: { participantAId: true, participantBId: true },
      });
      const partnerIds = (convs as any[]).map((c) =>
        c.participantAId === viewerId ? c.participantBId : c.participantAId,
      );
      const partnerSet = new Set(partnerIds);

      // 2. Following list
      const follows = await prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
        take: 200,
      });
      const followingSet = new Set((follows as any[]).map((f) => f.followingId));

      // 3. Priority IDs: conversation partners first, then following not already listed
      const priorityIds: string[] = [...partnerIds];
      const seenPriority = new Set(partnerIds);
      for (const id of followingSet) {
        if (!seenPriority.has(id)) {
          seenPriority.add(id);
          priorityIds.push(id);
        }
      }

      const userSelect = {
        id: true,
        username: true,
        displayName: true,
        profilePicture: true,
        _count: { select: { followerRelations: true } },
      };

      const baseWhere = {
        deleted: false,
        isBot: false,
        id: { not: viewerId },
        ...nameFilter,
      };

      // 4. Fetch priority users and popular users concurrently
      const [priorityUsers, popularUsers] = await Promise.all([
        priorityIds.length
          ? prisma.user.findMany({
              where: { id: { in: priorityIds }, ...baseWhere },
              select: userSelect,
            })
          : Promise.resolve([]),
        prisma.user.findMany({
          where: {
            ...baseWhere,
            ...(priorityIds.length
              ? { id: { notIn: priorityIds, not: viewerId } }
              : {}),
          },
          orderBy: { followerRelations: { _count: "desc" } },
          take: 20,
          select: userSelect,
        }),
      ]);

      // 5. Re-sort priority users to preserve original ranked order
      const priorityMap = new Map(
        (priorityUsers as any[]).map((u) => [u.id, u]),
      );
      const sortedPriority = priorityIds
        .map((id) => priorityMap.get(id))
        .filter(Boolean);

      // 6. Merge, deduplicate, cap at 30
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const u of [...sortedPriority, ...(popularUsers as any[])]) {
        if (!seen.has(u.id)) {
          seen.add(u.id);
          merged.push(u);
        }
      }

      return merged.slice(0, 30).map((u) => ({
        id: u.id,
        displayName: u.displayName,
        username: u.username,
        profilePicture: u.profilePicture ?? null,
        followersCount: u._count.followerRelations,
        isFollowing: followingSet.has(u.id),
        hasExistingConversation: partnerSet.has(u.id),
      }));
    },

    messages: async (
      _: unknown,
      {
        conversationId,
        limit = 50,
        before,
      }: { conversationId: string; limit?: number; before?: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) throw new Error("Not authenticated");

      await assertParticipant(conversationId, viewerId);

      const safeLimit = Math.min(Math.max(limit, 1), 100);

      const messages = await prisma.chatMessage.findMany({
        where: {
          conversationId,
          ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        },
        orderBy: { createdAt: "asc" },
        take: safeLimit,
        include: MESSAGE_INCLUDE,
      });

      const senderNames = await resolveParentSenderNames(messages as any[], viewerId);

      return (messages as any[]).map((msg) => {
        const parentSenderName = msg.parent
          ? msg.parent.senderId === viewerId
            ? "You"
            : (senderNames.get(msg.parent.senderId) ?? "Unknown")
          : null;
        return formatMessage(msg, viewerId, parentSenderName);
      });
    },
  },

  Mutation: {
    startConversation: async (
      _: unknown,
      { userId }: { userId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) throw new Error("Not authenticated");

      const targetId = userId.trim();
      if (!targetId || targetId === viewerId) throw new Error("Invalid userId");

      const target = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!target) throw new Error("User not found");

      const { participantAId, participantBId } = sortParticipants(viewerId, targetId);

      const conv = await prisma.conversation.upsert({
        where: { participantAId_participantBId: { participantAId, participantBId } },
        update: {},
        create: { participantAId, participantBId },
      });

      const result = await toConversationGraphQL(conv, viewerId, null, 0);
      if (!result) throw new Error("Failed to load conversation");
      return result;
    },

    sendMessage: async (
      _: unknown,
      {
        conversationId,
        text,
        replyToId,
        attachments,
      }: {
        conversationId: string;
        text?: string | null;
        replyToId?: string | null;
        attachments?: AttachmentInput[] | null;
      },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) throw new Error("Not authenticated");

      const trimmedText = text?.trim() || null;
      const validAttachments = (attachments ?? []).filter((a) => a.type?.trim());

      if (!trimmedText && !validAttachments.length) {
        throw new Error("A message must have text or at least one attachment");
      }

      await assertParticipant(conversationId, viewerId);

      // Validate replyToId belongs to this conversation
      if (replyToId) {
        const parent = await prisma.chatMessage.findUnique({
          where: { id: replyToId },
          select: { conversationId: true },
        });
        if (!parent || parent.conversationId !== conversationId) {
          throw new Error("Invalid replyToId");
        }
      }

      // Validate post attachments exist
      const postIds = validAttachments
        .filter((a) => a.type === "POST" && a.postId)
        .map((a) => a.postId as string);

      if (postIds.length) {
        const posts = await prisma.post.findMany({
          where: { id: { in: postIds }, deleted: false },
          select: { id: true },
        });
        if (posts.length !== postIds.length) {
          throw new Error("One or more attached posts were not found");
        }
      }

      const [message] = await prisma.$transaction([
        prisma.chatMessage.create({
          data: {
            conversationId,
            senderId: viewerId,
            text: trimmedText,
            status: "SENT",
            parentId: replyToId ?? null,
            attachments: validAttachments.length
              ? {
                  create: validAttachments.map((a) => ({
                    type: a.type,
                    postId: a.type === "POST" ? (a.postId ?? null) : null,
                  })),
                }
              : undefined,
          },
          include: MESSAGE_INCLUDE,
        }),
        prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        }),
      ]);

      const parentSenderName = (message as any).parent
        ? (message as any).parent.senderId === viewerId
          ? "You"
          : ((
              await prisma.user.findUnique({
                where: { id: (message as any).parent.senderId },
                select: { displayName: true },
              })
            )?.displayName ?? "Unknown")
        : null;

      return formatMessage(message as any, viewerId, parentSenderName);
    },

    markMessagesRead: async (
      _: unknown,
      { conversationId }: { conversationId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) throw new Error("Not authenticated");

      await assertParticipant(conversationId, viewerId);

      await prisma.chatMessage.updateMany({
        where: {
          conversationId,
          senderId: { not: viewerId },
          status: { not: "READ" },
          isUnsent: false,
        },
        data: { status: "READ" },
      });

      return true;
    },

    editMessage: async (
      _: unknown,
      { messageId, newText }: { messageId: string; newText: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) throw new Error("Not authenticated");

      const trimmedText = newText.trim();
      if (!trimmedText) throw new Error("Edited text cannot be empty");

      const existing = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        select: {
          senderId: true,
          isUnsent: true,
          text: true,
          conversationId: true,
        },
      });

      if (!existing) throw new Error("Message not found");
      if (existing.senderId !== viewerId) throw new Error("Cannot edit someone else's message");
      if (existing.isUnsent) throw new Error("Cannot edit an unsent message");
      if (existing.text === trimmedText) throw new Error("No change detected");

      const [updated] = await prisma.$transaction([
        prisma.chatMessage.update({
          where: { id: messageId },
          data: { text: trimmedText, editedAt: new Date() },
          include: MESSAGE_INCLUDE,
        }),
        prisma.chatMessageEdit.create({
          data: {
            messageId,
            previousText: existing.text ?? "",
          },
        }),
      ]);

      const parentSenderName = (updated as any).parent
        ? (updated as any).parent.senderId === viewerId
          ? "You"
          : ((
              await prisma.user.findUnique({
                where: { id: (updated as any).parent.senderId },
                select: { displayName: true },
              })
            )?.displayName ?? "Unknown")
        : null;

      return formatMessage(updated as any, viewerId, parentSenderName);
    },

    unsendMessage: async (
      _: unknown,
      { messageId }: { messageId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) throw new Error("Not authenticated");

      const existing = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        select: { senderId: true, isUnsent: true },
      });

      if (!existing) throw new Error("Message not found");
      if (existing.senderId !== viewerId) throw new Error("Cannot unsend someone else's message");
      if (existing.isUnsent) throw new Error("Message already unsent");

      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { isUnsent: true },
      });

      return true;
    },
  },
};
