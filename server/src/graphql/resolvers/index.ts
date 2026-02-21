import { UserResolver } from "./user.resolver";
import { PostResolver } from "./post.resolver";

export const resolvers = {
  Query: {
    ...UserResolver.Query,
    ...PostResolver.Query,
  },
  Mutation: {
    ...UserResolver.Mutation,
    ...PostResolver.Mutation,
  },
  Post: {
    ...PostResolver.Post,
  },
  User: {
    ...UserResolver.User,
  },
};
