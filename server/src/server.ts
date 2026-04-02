import { ApolloServer } from "apollo-server";
import { typeDefs, resolvers } from "./graphql/index.js";
import { context } from "./auth/context.js";

export const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
});
