import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { ApolloServer } from "apollo-server-express";
import { context } from "./auth/context.js";
import { typeDefs, resolvers } from "./graphql/index.js";
import { registerPostActivityRealtime } from "./realtime/postActivity.js";
import { handleGumroadWebhook } from "./billing/gumroad.js";

const GRAPHQL_BODY_LIMIT = process.env.GRAPHQL_BODY_LIMIT?.trim() || "35mb";

type RestUser = {
  sub: string;
  email?: string;
};

type AuthenticatedRequest = express.Request & {
  user?: RestUser;
};

const requireAuthenticatedUser: express.RequestHandler = (req, res, next) => {
  const auth = req.headers.authorization;
  const secret = process.env.JWT_SECRET;

  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET is not configured" });
    return;
  }

  try {
    const token = auth.replace("Bearer ", "");
    (req as AuthenticatedRequest).user = jwt.verify(token, secret) as RestUser;
    next();
  } catch {
    res.status(401).json({ error: "Not authenticated" });
  }
};

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

      app.post(
        "/billing/gumroad/webhook",
        express.urlencoded({ extended: false, limit: "16kb" }),
        async (req, res) => {
          try {
            const body = new URLSearchParams(
              req.body as Record<string, string>,
            );
            const result = await handleGumroadWebhook(body);
            res.status(200).json(result);
          } catch (error) {
            console.error("Gumroad webhook rejected", error);
            res.status(400).json({
              error:
                error instanceof Error
                  ? error.message
                  : "Invalid Gumroad webhook",
            });
          }
        },
      );

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
