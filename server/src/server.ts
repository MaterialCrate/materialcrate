import http from "node:http";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { context } from "./auth/context.js";
import { typeDefs, resolvers } from "./graphql/index.js";
import { registerPostActivityRealtime } from "./realtime/postActivity.js";

const GRAPHQL_BODY_LIMIT = process.env.GRAPHQL_BODY_LIMIT?.trim() || "35mb";

export const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
});

let httpServerPromise: Promise<http.Server> | null = null;

export const createHttpServer = () => {
  if (!httpServerPromise) {
    httpServerPromise = (async () => {
      await server.start();

      const app = express();
      app.disable("x-powered-by");
      app.get("/health", (_, res) => {
        res.status(200).json({ ok: true });
      });
      app.get("/.well-known/apollo/server-health", (_, res) => {
        res.status(200).json({ ok: true });
      });

      server.applyMiddleware({
        app,
        path: "/graphql",
        cors: {
          origin: true,
          credentials: true,
        },
        bodyParserConfig: {
          limit: GRAPHQL_BODY_LIMIT,
        },
      });

      const httpServer = http.createServer(app);
      registerPostActivityRealtime(httpServer);

      return httpServer;
    })();
  }

  return httpServerPromise;
};
