import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  sendVerificationEmailForUser,
  verifyEmailCode,
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
      const { email, password, username, firstName, surname, institution, program } = args;
      const normalizedFirstName = firstName?.trim();
      const normalizedSurname = surname?.trim();

      if (!email || !password || !username || !normalizedFirstName || !normalizedSurname) {
        throw new Error(
          "Email, password, username, first name, and surname are required",
        );
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
      const createUserData = {
        email,
        password: hashed,
        username,
        firstName: normalizedFirstName,
        surname: normalizedSurname,
        institution: institution ?? null,
        program: program ?? null,
      };

      const user = await prisma.user.create({
        data: createUserData as any,
      }).catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("Email or username already in use");
        }

        throw error;
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

    verifyEmailCode: async (
      _: unknown,
      { email, code }: { email: string; code: string },
    ) => {
      if (!email || !code) {
        throw new Error("Email and code are required");
      }

      return verifyEmailCode(email, code);
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

      const username = args.username?.trim();
      const firstName = args.firstName?.trim();
      const surname = args.surname?.trim();
      const institution = args.institution?.trim();

      if (!username || !firstName || !surname || !institution) {
        throw new Error(
          "Username, first name, surname, and institution are required",
        );
      }

      try {
        return await prisma.user.update({
          where: { id: ctx.user.sub },
          data: {
            username,
            firstName,
            surname,
            institution,
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
  User: {
    followers: async (user: { id: string }) => {
      const follows = await (prisma as any).follow.findMany({
        where: { followingId: user.id },
        include: { follower: true },
        orderBy: { createdAt: "desc" },
      });

      return follows.map((entry: { follower: unknown }) => entry.follower);
    },
    following: async (user: { id: string }) => {
      const follows = await (prisma as any).follow.findMany({
        where: { followerId: user.id },
        include: { following: true },
        orderBy: { createdAt: "desc" },
      });

      return follows.map((entry: { following: unknown }) => entry.following);
    },
    followersCount: async (user: { id: string }) => {
      return (prisma as any).follow.count({
        where: { followingId: user.id },
      });
    },
    followingCount: async (user: { id: string }) => {
      return (prisma as any).follow.count({
        where: { followerId: user.id },
      });
    },
  },
};
