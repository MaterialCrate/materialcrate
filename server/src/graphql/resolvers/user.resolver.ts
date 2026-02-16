import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  sendVerificationEmailForUser,
  verifyEmailToken,
} from "../../auth/emailVerification";

const createToken = (userId: string, email: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ sub: userId, email }, secret, { expiresIn: "7d" });
};

export const UserResolver = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: any) => {
      if (!ctx.user?.sub) return null;
      return prisma.user.findUnique({ where: { id: ctx.user.sub } });
    },

    user: async (_: unknown, { id }: { id: string }) => {
      return prisma.user.findUnique({ where: { id } });
    },
  },

  Mutation: {
    signup: async (_: unknown, args: any) => {
      const { email, password, username, institution, program } = args;

      if (!email || !password || !username) {
        throw new Error("Email, password, and username are required");
      }

      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existing) {
        throw new Error("Email or username already in use");
      }

      const hashed = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashed,
          username,
          institution: institution ?? null,
          program: program ?? null,
        },
      });

      await sendVerificationEmailForUser(user.id, user.email);

      const token = createToken(user.id, user.email);
      return { token, user };
    },

    login: async (_: unknown, args: any) => {
      const { email, password } = args;

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password) {
        throw new Error("Invalid credentials");
      }

      if (!user.emailVerified) {
        throw new Error("Email is not verified");
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        throw new Error("Invalid credentials");
      }

      const token = createToken(user.id, user.email);
      return { token, user };
    },

    verifyEmail: async (_: unknown, { token }: { token: string }) => {
      if (!token) {
        throw new Error("Verification token is required");
      }

      return verifyEmailToken(token);
    },

    resendVerificationEmail: async (
      _: unknown,
      { email }: { email: string },
    ) => {
      if (!email) {
        throw new Error("Email is required");
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return true;
      }

      if (user.emailVerified) {
        return true;
      }

      await sendVerificationEmailForUser(user.id, user.email);
      return true;
    },

    completeProfile: async (_: unknown, args: any, ctx: any) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      try {
        return await prisma.user.update({
          where: { id: ctx.user.sub },
          data: {
            username: args.username,
            institution: args.institution,
            program: args.program ?? null,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("Username already in use");
        }

        throw error;
      }
    },
  },
};
