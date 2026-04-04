import { UserResolver } from "./user.resolver.js";
import { ArchiveResolver } from "./archive.resolver.js";
import { HubChatResolver } from "./hub-chat.resolver.js";
import { PostResolver } from "./post.resolver.js";
import { WorkspaceResolver } from "./workspace.resolver.js";
import { NotificationResolver } from "./notification.resolver.js";
import { ReportResolver } from "./report.resolver.js";
import { SupportResolver } from "./support.resolver.js";

export const resolvers = {
  Query: {
    ...UserResolver.Query,
    ...ArchiveResolver.Query,
    ...HubChatResolver.Query,
    ...PostResolver.Query,
    ...WorkspaceResolver.Query,
    ...NotificationResolver.Query,
    ...ReportResolver.Query,
  },
  Mutation: {
    ...UserResolver.Mutation,
    ...ArchiveResolver.Mutation,
    ...HubChatResolver.Mutation,
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
  HubChat: {
    ...HubChatResolver.HubChat,
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
