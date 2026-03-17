import { UserResolver } from "./user.resolver";
import { ArchiveResolver } from "./archive.resolver";
import { PostResolver } from "./post.resolver";
import { WorkspaceResolver } from "./workspace.resolver";

export const resolvers = {
  Query: {
    ...UserResolver.Query,
    ...ArchiveResolver.Query,
    ...PostResolver.Query,
    ...WorkspaceResolver.Query,
  },
  Mutation: {
    ...UserResolver.Mutation,
    ...ArchiveResolver.Mutation,
    ...PostResolver.Mutation,
    ...WorkspaceResolver.Mutation,
  },
  Post: {
    ...PostResolver.Post,
  },
  Comment: {
    ...PostResolver.Comment,
  },
  User: {
    ...UserResolver.User,
    ...ArchiveResolver.User,
    ...WorkspaceResolver.User,
  },
  Archive: {
    ...ArchiveResolver.Archive,
  },
  ArchiveFolder: {
    ...ArchiveResolver.ArchiveFolder,
  },
  ArchiveSavedPost: {
    ...ArchiveResolver.ArchiveSavedPost,
  },
  Workspace: {
    ...WorkspaceResolver.Workspace,
  },
  WorkspaceFolder: {
    ...WorkspaceResolver.WorkspaceFolder,
  },
  WorkspaceSavedPost: {
    ...WorkspaceResolver.WorkspaceSavedPost,
  },
};
