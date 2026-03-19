import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

type GraphQLContext = {
  user?: {
    sub?: string;
  };
};

const buildPostInclude = (viewerId?: string) => {
  const include: any = {
    author: true,
    _count: {
      select: {
        likes: true,
        comments: true,
      },
    },
  };

  if (viewerId) {
    include.likes = {
      where: { userId: viewerId },
      select: { userId: true },
    };
  }

  return include;
};

const mapPostForGraphQL = (post: any, viewerId?: string) => ({
  ...post,
  likeCount: post?._count?.likes ?? 0,
  commentCount: post?._count?.comments ?? 0,
  viewerHasLiked: viewerId ? (post?.likes?.length ?? 0) > 0 : false,
});

const buildArchiveInclude = (viewerId?: string) => ({
  folders: {
    orderBy: { createdAt: "asc" as const },
  },
  savedPosts: {
    include: {
      folder: true,
      post: {
        include: buildPostInclude(viewerId),
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
});

const mapSavedPostForGraphQL = (savedPost: any, viewerId?: string) => ({
  ...savedPost,
  post: savedPost?.post ? mapPostForGraphQL(savedPost.post, viewerId) : savedPost?.post,
});

const mapArchiveForGraphQL = (archive: any, viewerId?: string) => ({
  ...archive,
  savedPosts: Array.isArray(archive?.savedPosts)
    ? archive.savedPosts.map((savedPost: any) =>
        mapSavedPostForGraphQL(savedPost, viewerId),
      )
    : [],
});

export const ensureArchiveForUserId = async (
  userId: string,
  viewerId?: string,
) => {
  const archive = await (prisma as any).archive.upsert({
    where: { userId },
    create: {
      userId,
      name: "My Archive",
    },
    update: {},
    include: buildArchiveInclude(viewerId),
  });

  return mapArchiveForGraphQL(archive, viewerId);
};

export const ArchiveResolver = {
  Query: {
    myArchive: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      return ensureArchiveForUserId(viewerId, viewerId);
    },
  },
  Mutation: {
    createArchiveFolder: async (
      _: unknown,
      { name }: { name: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedName = name?.trim();
      if (!normalizedName) {
        throw new Error("Folder name is required");
      }
      if (normalizedName.length > 80) {
        throw new Error("Folder name cannot exceed 80 characters");
      }

      const archive = await ensureArchiveForUserId(viewerId, viewerId);

      try {
        return await (prisma as any).archiveFolder.create({
          data: {
            archiveId: archive.id,
            name: normalizedName,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("Folder name already exists");
        }

        throw error;
      }
    },
    updateArchiveFolder: async (
      _: unknown,
      { folderId, name }: { folderId: string; name: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedFolderId = folderId?.trim();
      if (!normalizedFolderId) {
        throw new Error("folderId is required");
      }

      const normalizedName = name?.trim();
      if (!normalizedName) {
        throw new Error("Folder name is required");
      }
      if (normalizedName.length > 80) {
        throw new Error("Folder name cannot exceed 80 characters");
      }

      const archive = await ensureArchiveForUserId(viewerId, viewerId);

      const folder = await (prisma as any).archiveFolder.findFirst({
        where: {
          id: normalizedFolderId,
          archiveId: archive.id,
        },
        select: {
          id: true,
        },
      });

      if (!folder) {
        throw new Error("Folder not found");
      }

      try {
        return await (prisma as any).archiveFolder.update({
          where: { id: normalizedFolderId },
          data: { name: normalizedName },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("Folder name already exists");
        }

        throw error;
      }
    },
    deleteArchiveFolder: async (
      _: unknown,
      { folderId }: { folderId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedFolderId = folderId?.trim();
      if (!normalizedFolderId) {
        throw new Error("folderId is required");
      }

      const archive = await ensureArchiveForUserId(viewerId, viewerId);

      const folder = await (prisma as any).archiveFolder.findFirst({
        where: {
          id: normalizedFolderId,
          archiveId: archive.id,
        },
        select: {
          id: true,
        },
      });

      if (!folder) {
        throw new Error("Folder not found");
      }

      await prisma.$transaction([
        (prisma as any).archiveSavedPost.deleteMany({
          where: {
            archiveId: archive.id,
            folderId: normalizedFolderId,
          },
        }),
        (prisma as any).archiveFolder.delete({
          where: {
            id: normalizedFolderId,
          },
        }),
      ]);

      return true;
    },
    savePostToArchive: async (
      _: unknown,
      { postId, folderId }: { postId: string; folderId?: string | null },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedPostId = postId?.trim();
      if (!normalizedPostId) {
        throw new Error("postId is required");
      }

      const normalizedFolderId = folderId?.trim() || null;
      const archive = await ensureArchiveForUserId(viewerId, viewerId);

      const post = await prisma.post.findUnique({
        where: { id: normalizedPostId },
        select: { id: true },
      });
      if (!post) {
        throw new Error("Post not found");
      }

      if (normalizedFolderId) {
        const folder = await (prisma as any).archiveFolder.findFirst({
          where: {
            id: normalizedFolderId,
            archiveId: archive.id,
          },
          select: { id: true },
        });
        if (!folder) {
          throw new Error("Folder not found");
        }
      }

      const savedPost = await (prisma as any).archiveSavedPost.upsert({
        where: {
          archiveId_postId: {
            archiveId: archive.id,
            postId: normalizedPostId,
          },
        },
        create: {
          archiveId: archive.id,
          folderId: normalizedFolderId,
          postId: normalizedPostId,
        },
        update: {
          folderId: normalizedFolderId,
        },
        include: {
          folder: true,
          post: {
            include: buildPostInclude(viewerId),
          },
        },
      });

      return mapSavedPostForGraphQL(savedPost, viewerId);
    },
    removeArchivedPost: async (
      _: unknown,
      { savedPostId }: { savedPostId: string },
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      const normalizedSavedPostId = savedPostId?.trim();
      if (!normalizedSavedPostId) {
        throw new Error("savedPostId is required");
      }

      const archive = await ensureArchiveForUserId(viewerId, viewerId);
      const deleted = await (prisma as any).archiveSavedPost.deleteMany({
        where: {
          id: normalizedSavedPostId,
          archiveId: archive.id,
        },
      });

      return deleted.count > 0;
    },
  },
  User: {
    archive: async (user: { id: string }, _: unknown, ctx: GraphQLContext) => {
      return ensureArchiveForUserId(user.id, ctx.user?.sub);
    },
  },
  Archive: {
    folders: async (archive: any) => {
      if (Array.isArray(archive.folders)) {
        return archive.folders;
      }

      return (prisma as any).archiveFolder.findMany({
        where: { archiveId: archive.id },
        orderBy: { createdAt: "asc" },
      });
    },
    savedPosts: async (archive: any, _: unknown, ctx: GraphQLContext) => {
      const viewerId = ctx.user?.sub;
      const rows = Array.isArray(archive.savedPosts)
        ? archive.savedPosts
        : await (prisma as any).archiveSavedPost.findMany({
            where: { archiveId: archive.id },
            include: {
              folder: true,
              post: {
                include: buildPostInclude(viewerId),
              },
            },
            orderBy: { createdAt: "desc" },
          });

      return rows.map((row: any) => mapSavedPostForGraphQL(row, viewerId));
    },
  },
  ArchiveFolder: {
    savedPosts: async (
      folder: { id: string },
      _: unknown,
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const rows = await (prisma as any).archiveSavedPost.findMany({
        where: { folderId: folder.id },
        include: {
          folder: true,
          post: {
            include: buildPostInclude(viewerId),
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return rows.map((row: any) => mapSavedPostForGraphQL(row, viewerId));
    },
  },
  ArchiveSavedPost: {
    post: (savedPost: any) => {
      if (!savedPost.post) {
        throw new Error("Saved post is missing post data");
      }
      return savedPost.post;
    },
    folder: async (savedPost: any) => {
      if (savedPost.folderId == null) {
        return null;
      }
      if (savedPost.folder) {
        return savedPost.folder;
      }

      return (prisma as any).archiveFolder.findUnique({
        where: { id: savedPost.folderId },
      });
    },
  },
};
