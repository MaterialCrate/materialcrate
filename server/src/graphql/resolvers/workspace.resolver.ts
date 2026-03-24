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

const buildWorkspaceInclude = (viewerId?: string) => ({
  folders: {
    orderBy: { createdAt: "asc" as const },
  },
  savedPosts: {
    where: {
      post: {
        deleted: false,
      },
    },
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

const mapWorkspaceForGraphQL = (workspace: any, viewerId?: string) => ({
  ...workspace,
  savedPosts: Array.isArray(workspace?.savedPosts)
    ? workspace.savedPosts.map((savedPost: any) =>
        mapSavedPostForGraphQL(savedPost, viewerId),
      )
    : [],
});

export const ensureWorkspaceForUserId = async (
  userId: string,
  viewerId?: string,
) => {
  const workspace = await (prisma as any).workspace.upsert({
    where: { userId },
    create: {
      userId,
      name: "My Workspace",
    },
    update: {},
    include: buildWorkspaceInclude(viewerId),
  });

  return mapWorkspaceForGraphQL(workspace, viewerId);
};

export const WorkspaceResolver = {
  Query: {
    myWorkspace: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) {
        throw new Error("Not authenticated");
      }

      return ensureWorkspaceForUserId(viewerId, viewerId);
    },
  },
  Mutation: {
    createWorkspaceFolder: async (
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

      const workspace = await ensureWorkspaceForUserId(viewerId, viewerId);

      try {
        return await (prisma as any).workspaceFolder.create({
          data: {
            workspaceId: workspace.id,
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
    savePostToWorkspace: async (
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
      const workspace = await ensureWorkspaceForUserId(viewerId, viewerId);

      const post = await prisma.post.findUnique({
        where: { id: normalizedPostId },
        select: { id: true, deleted: true },
      });
      if (!post || post.deleted) {
        throw new Error("Post not found");
      }

      if (normalizedFolderId) {
        const folder = await (prisma as any).workspaceFolder.findFirst({
          where: {
            id: normalizedFolderId,
            workspaceId: workspace.id,
          },
          select: { id: true },
        });
        if (!folder) {
          throw new Error("Folder not found");
        }
      }

      const savedPost = await (prisma as any).workspaceSavedPost.upsert({
        where: {
          workspaceId_postId: {
            workspaceId: workspace.id,
            postId: normalizedPostId,
          },
        },
        create: {
          workspaceId: workspace.id,
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
    removeSavedPost: async (
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

      const workspace = await ensureWorkspaceForUserId(viewerId, viewerId);
      const deleted = await (prisma as any).workspaceSavedPost.deleteMany({
        where: {
          id: normalizedSavedPostId,
          workspaceId: workspace.id,
        },
      });

      return deleted.count > 0;
    },
  },
  User: {
    workspace: async (user: { id: string }, _: unknown, ctx: GraphQLContext) => {
      return ensureWorkspaceForUserId(user.id, ctx.user?.sub);
    },
  },
  Workspace: {
    folders: async (workspace: any) => {
      if (Array.isArray(workspace.folders)) {
        return workspace.folders;
      }

      return (prisma as any).workspaceFolder.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
      });
    },
    savedPosts: async (workspace: any, _: unknown, ctx: GraphQLContext) => {
      const viewerId = ctx.user?.sub;
      const rows = Array.isArray(workspace.savedPosts)
        ? workspace.savedPosts
        : await (prisma as any).workspaceSavedPost.findMany({
            where: {
              workspaceId: workspace.id,
              post: {
                deleted: false,
              },
            },
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
  WorkspaceFolder: {
    savedPosts: async (
      folder: { id: string },
      _: unknown,
      ctx: GraphQLContext,
    ) => {
      const viewerId = ctx.user?.sub;
      const rows = await (prisma as any).workspaceSavedPost.findMany({
        where: {
          folderId: folder.id,
          post: {
            deleted: false,
          },
        },
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
  WorkspaceSavedPost: {
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

      return (prisma as any).workspaceFolder.findUnique({
        where: { id: savedPost.folderId },
      });
    },
  },
};
