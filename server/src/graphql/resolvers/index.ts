import { UserResolver } from "./user.resolver";
import { PostResolver } from "./post.resolver";

export const resolvers = {
  Query: {
    ...UserResolver.Query,
  },
  Mutation: {
    ...UserResolver.Mutation,
    ...PostResolver.Mutation,
  },
};
