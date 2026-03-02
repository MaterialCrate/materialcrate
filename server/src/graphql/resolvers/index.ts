import { UserResolver } from "./user.resolver";
import { PostResolver } from "./post.resolver";
import { WorkspaceResolver } from "./workspace.resolver";

export const resolvers = {
  Query: {
    ...UserResolver.Query,
    ...PostResolver.Query,
    ...WorkspaceResolver.Query,
  },
  Mutation: {
    ...UserResolver.Mutation,
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
    ...WorkspaceResolver.User,
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
