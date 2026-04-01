import { UserResolver } from "./user.resolver";
import { ArchiveResolver } from "./archive.resolver";
import { PostResolver } from "./post.resolver";
import { WorkspaceResolver } from "./workspace.resolver";
import { NotificationResolver } from "./notification.resolver";
import { ReportResolver } from "./report.resolver";
import { SupportResolver } from "./support.resolver";

export const resolvers = {
  Query: {
    ...UserResolver.Query,
    ...ArchiveResolver.Query,
    ...PostResolver.Query,
    ...WorkspaceResolver.Query,
    ...NotificationResolver.Query,
    ...ReportResolver.Query,
  },
  Mutation: {
    ...UserResolver.Mutation,
    ...ArchiveResolver.Mutation,
    ...PostResolver.Mutation,
    ...WorkspaceResolver.Mutation,
    ...NotificationResolver.Mutation,
    ...ReportResolver.Mutation,
    ...SupportResolver.Mutation,
  },
  Post: {
    ...PostResolver.Post,
  },
  Comment: {
    ...PostResolver.Comment,
  },
  PostVersion: {
    ...PostResolver.PostVersion,
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
