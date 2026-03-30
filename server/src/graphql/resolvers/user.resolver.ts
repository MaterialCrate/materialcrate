import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes, randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { s3 } from "../../config/s3";
import {
  beginPendingEmailChange,
  getVisiblePendingEmail,
  resendPendingEmailChange,
  sendPasswordChangedEmail,
  sendVerificationEmailForUser,
  verifyEmailCode,
  verifyPendingEmailChange,
} from "../../auth/emailVerification";
import { sendAccountDeletedEmail } from "../../email/accountDeletedEmail";
import { sendAccountRecoveredEmail } from "../../email/accountRecoveredEmail";
import { ensureWorkspaceForUserId } from "./workspace.resolver";
import {
  createNotification,
  NOTIFICATION_ICON,
  NOTIFICATION_TYPE,
} from "../../services/notifications";

const createToken = (userId: string, email: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ sub: userId, email }, secret, { expiresIn: "7d" });
};

const RESERVED_USERNAMES = new Set(["deleted", "disabled"]);
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const ACCOUNT_RESTORE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const SOCIAL_PROVIDER_MAP = {
  google: "GOOGLE",
  facebook: "FACEBOOK",
} as const;

type SocialProviderKey = keyof typeof SOCIAL_PROVIDER_MAP;
type SocialProviderValue = (typeof SOCIAL_PROVIDER_MAP)[SocialProviderKey];

const normalizeSocialProvider = (provider: unknown): SocialProviderValue => {
  const normalized = String(provider || "")
    .trim()
    .toLowerCase();
  if (normalized === "google") return SOCIAL_PROVIDER_MAP.google;
  if (normalized === "facebook") return SOCIAL_PROVIDER_MAP.facebook;
  throw new Error("Unsupported social provider");
};

const sanitizeUsernameCandidate = (value: string) => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
  return normalized.slice(0, 24);
};

const generateUniqueUsername = async (baseValue: string) => {
  const safeBase =
    sanitizeUsernameCandidate(baseValue) ||
    `user${Math.floor(Math.random() * 900000 + 100000)}`;
  let candidate = safeBase;
  let suffix = 0;

  while (suffix < 1000) {
    if (!RESERVED_USERNAMES.has(candidate.toLowerCase())) {
      const existing = await (prisma as any).user.findFirst({
        where: { username: candidate },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
    }

    suffix += 1;
    candidate = `${safeBase}${suffix}`.slice(0, 30);
  }

  throw new Error("Could not generate a unique username");
};

const getDeletedAccountRestoreDeadline = (deletedAt: unknown) => {
  if (!deletedAt) return null;
  const parsed =
    deletedAt instanceof Date ? deletedAt : new Date(String(deletedAt));
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getTime() + ACCOUNT_RESTORE_WINDOW_MS);
};

const getDeletedAccountRestoreState = (user: any) => {
  if (!user?.deleted) {
    return {
      canRestore: false,
      restoreDeadline: null,
    };
  }

  const restoreDeadline = getDeletedAccountRestoreDeadline(user.deletedAt);
  if (!restoreDeadline) {
    return {
      canRestore: false,
      restoreDeadline: null,
    };
  }

  return {
    canRestore: restoreDeadline.getTime() > Date.now(),
    restoreDeadline,
  };
};

const buildAuthPayload = async (
  user: any,
  options?: {
    restoreRequired?: boolean;
    restoreDeadline?: Date | null;
  },
) => {
  const token = createToken(user.id, user.email);
  return {
    token,
    user,
    verificationEmailSent: true,
    verificationEmailError: null,
    restoreRequired: Boolean(options?.restoreRequired),
    restoreDeadline: toIsoStringOrNull(options?.restoreDeadline),
  };
};

const ensureUserCanLogin = async (user: any) => {
  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (user.deleted) {
    const { canRestore, restoreDeadline } = getDeletedAccountRestoreState(user);
    if (canRestore) {
      const error = new Error("Account restoration required");
      Object.assign(error, {
        restoreRequired: true,
        restoreDeadline: toIsoStringOrNull(restoreDeadline),
      });
      throw error;
    }

    throw new Error("Account has been permanently deleted");
  }

  if (user.disabled) {
    const now = new Date();
    const disabledUntil = user.disabledUntil
      ? new Date(user.disabledUntil)
      : null;

    if (disabledUntil && now >= disabledUntil) {
      const reactivated = await (prisma as any).user.update({
        where: { id: user.id },
        data: {
          disabled: false,
          disabledAt: null,
          disabledUntil: null,
        },
      });
      return reactivated;
    }

    throw new Error("Account is disabled");
  }

  return user;
};

const includeProviderInLinkedSeos = (
  linkedSEOs: unknown,
  provider: SocialProviderValue,
) => {
  const existing = Array.isArray(linkedSEOs)
    ? linkedSEOs.filter((value): value is string => typeof value === "string")
    : [];
  if (existing.includes(provider)) {
    return existing;
  }
  return [...existing, provider];
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

const buildS3FileUrl = (bucket: string, region: string, key: string) =>
  `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
const MAX_PROFILE_PICTURE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_PICTURE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
const PROFILE_PICTURE_MAX_DIMENSION = 512;
const PROFILE_PICTURE_WEBP_QUALITY = 82;
const DEFAULT_PROFILE_BACKGROUND =
  "bg-linear-to-br from-[#E1761F] via-[#ffecdc] to-stone-200";
const MAX_PROFILE_BACKGROUND_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_BACKGROUND_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const extractS3KeyFromUrl = (
  fileUrl: string,
  bucket: string,
  region: string,
) => {
  try {
    const parsed = new URL(fileUrl);
    const expectedHost = `${bucket}.s3.${region}.amazonaws.com`;
    if (parsed.hostname !== expectedHost) {
      return null;
    }

    const key = parsed.pathname.replace(/^\/+/, "");
    return key ? decodeURIComponent(key) : null;
  } catch {
    return null;
  }
};

const toIsoStringOrNull = (value: unknown) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const getBlockedUserIdsForViewer = async (viewerId?: string) => {
  if (!viewerId) {
    return [];
  }

  const viewer = await (prisma as any).user.findUnique({
    where: { id: viewerId },
    select: { blockedUserIds: true },
  });

  return Array.isArray(viewer?.blockedUserIds) ? viewer.blockedUserIds : [];
};

export const UserResolver = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: any) => {
      if (!ctx.user?.sub) return null;
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.sub },
      });
      if (!user) return null;
      await ensureWorkspaceForUserId(user.id, ctx.user.sub);
      return user;
    },

    user: async (_: unknown, { id }: { id: string }) => {
      return prisma.user.findUnique({ where: { id } });
    },

    userByUsername: async (
      _: unknown,
      { username }: { username: string },
      ctx: any,
    ) => {
      const normalizedUsername = String(username || "").trim();
      if (!normalizedUsername) {
        return null;
      }

      const viewerId = ctx.user?.sub;

      return (prisma as any).user.findFirst({
        where: {
          username: {
            equals: normalizedUsername,
            mode: "insensitive",
          },
          deleted: false,
          disabled: false,
          ...(viewerId
            ? {
                NOT: {
                  blockedUserIds: {
                    has: viewerId,
                  },
                },
              }
            : {}),
        },
      });
    },

    searchUsers: async (
      _: unknown,
      { query, limit = 12 }: { query: string; limit?: number },
      ctx: any,
    ) => {
      const normalizedQuery = String(query || "").trim();
      if (!normalizedQuery) {
        return [];
      }

      const safeLimit = Math.max(1, Math.min(limit, 25));
      const viewerId = ctx.user?.sub;

      return (prisma as any).user.findMany({
        where: {
          deleted: false,
          disabled: false,
          ...(viewerId
            ? {
                NOT: {
                  blockedUserIds: {
                    has: viewerId,
                  },
                },
              }
            : {}),
          OR: [
            {
              username: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              displayName: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              institution: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              program: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
          ],
        },
        orderBy: [{ createdAt: "desc" }],
        take: safeLimit,
      });
    },

    usernameAvailable: async (
      _: unknown,
      { username }: { username: string },
    ) => {
      const trimmedUsername = username?.trim();
      if (!trimmedUsername) return false;

      if (!USERNAME_REGEX.test(trimmedUsername)) {
        return false;
      }

      if (RESERVED_USERNAMES.has(trimmedUsername.toLowerCase())) {
        return false;
      }

      const existing = await (prisma as any).user.findFirst({
        where: {
          username: {
            equals: trimmedUsername,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      return !existing;
    },
    emailAvailable: async (_: unknown, { email }: { email: string }) => {
      const trimmedEmail = String(email || "")
        .trim()
        .toLowerCase();
      if (!trimmedEmail) return false;

      const existing = await (prisma as any).user.findFirst({
        where: {
          email: {
            equals: trimmedEmail,
            mode: "insensitive",
          },
          deleted: false,
        },
        select: { id: true },
      });

      return !existing;
    },

    pendingFollowRequestId: async (
      _: unknown,
      { username }: { username: string },
      ctx: any,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) return null;

      const normalizedUsername = String(username || "").trim();
      if (!normalizedUsername) return null;

      const targetUser = await (prisma as any).user.findFirst({
        where: {
          username: { equals: normalizedUsername, mode: "insensitive" },
          deleted: false,
          disabled: false,
        },
        select: { id: true },
      });
      if (!targetUser) return null;

      const request = await (prisma as any).followRequest.findFirst({
        where: {
          requesterId: viewerId,
          targetId: targetUser.id,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });

      return request?.id ?? null;
    },

    pendingFollowRequestForActor: async (
      _: unknown,
      { actorId }: { actorId: string },
      ctx: any,
    ) => {
      const viewerId = ctx.user?.sub;
      if (!viewerId) return null;

      const normalizedActorId = String(actorId || "").trim();
      if (!normalizedActorId) return null;

      const request = await (prisma as any).followRequest.findFirst({
        where: {
          requesterId: normalizedActorId,
          targetId: viewerId,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });

      return request?.id ?? null;
    },
  },

  Mutation: {
    signup: async (_: unknown, args: any) => {
      const { email, password, username, displayName, institution, program } =
        args;
      const normalizedUsername = username?.trim();
      const normalizedDisplayName = displayName?.trim();

      if (
        !email ||
        !password ||
        !normalizedUsername ||
        !normalizedDisplayName
      ) {
        throw new Error(
          "Email, password, username, and display name are required",
        );
      }

      if (RESERVED_USERNAMES.has(normalizedUsername.toLowerCase())) {
        throw new Error("This username is reserved");
      }

      const existing = await (prisma as any).user.findFirst({
        where: {
          deleted: false,
          disabled: false,
          OR: [{ email }, { username: normalizedUsername }],
        },
      });

      if (existing) {
        throw new Error("Email or username already in use");
      }

      const hashed = await bcrypt.hash(password, 12);
      const createUserData = {
        email,
        password: hashed,
        username: normalizedUsername,
        displayName: normalizedDisplayName,
        institution: institution ?? null,
        program: program ?? null,
      };

      const user = await prisma.user
        .create({
          data: {
            ...(createUserData as any),
            workspace: {
              create: {
                name: "My Workspace",
              },
            },
          },
        })
        .catch((error) => {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new Error("Email or username already in use");
          }

          throw error;
        });

      let verificationEmailSent = true;
      let verificationEmailError: string | null = null;

      try {
        await sendVerificationEmailForUser(user.id, user.email);
      } catch (error) {
        verificationEmailSent = false;
        verificationEmailError =
          error instanceof Error
            ? error.message
            : "Failed to send verification email";
        console.error(
          "Failed to send verification email during signup:",
          error,
        );
      }

      const token = createToken(user.id, user.email);
      return {
        token,
        user,
        verificationEmailSent,
        verificationEmailError,
        restoreRequired: false,
        restoreDeadline: null,
      };
    },

    login: async (_: unknown, args: any) => {
      const { email, password } = args;

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const user = await (prisma as any).user.findFirst({
        where: { email },
      });
      if (!user || !user.password) {
        throw new Error("Invalid credentials");
      }

      if (user.disabled) {
        const now = new Date();
        const disabledUntil = user.disabledUntil
          ? new Date(user.disabledUntil)
          : null;

        if (disabledUntil && now >= disabledUntil) {
          await (prisma as any).user.update({
            where: { id: user.id },
            data: {
              disabled: false,
              disabledAt: null,
              disabledUntil: null,
            },
          });
          user.disabled = false;
        } else {
          throw new Error("Account is disabled");
        }
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        throw new Error("Invalid credentials");
      }

      if (user.deleted) {
        const { canRestore, restoreDeadline } =
          getDeletedAccountRestoreState(user);
        if (!canRestore) {
          throw new Error("Account has been permanently deleted");
        }

        return buildAuthPayload(user, {
          restoreRequired: true,
          restoreDeadline,
        });
      }

      if (!user.emailVerified) {
        throw new Error("Email is not verified");
      }

      await ensureWorkspaceForUserId(user.id, user.id);

      return buildAuthPayload(user);
    },
    socialAuth: async (_: unknown, args: any) => {
      const provider = normalizeSocialProvider(args.provider);
      const providerUserId = String(args.providerUserId || "").trim();
      const email = String(args.email || "")
        .trim()
        .toLowerCase();
      const displayName = String(args.displayName || "").trim();

      if (!providerUserId || !email) {
        throw new Error("providerUserId and email are required");
      }

      const derivedDisplayName =
        displayName || email.split("@")[0]?.trim() || "User";

      const existingSeoAccount = await (prisma as any).seoAccount.findUnique({
        where: {
          provider_providerUserId: {
            provider,
            providerUserId,
          },
        },
        include: {
          user: true,
        },
      });

      if (existingSeoAccount?.user) {
        if (existingSeoAccount.user.deleted) {
          const { canRestore, restoreDeadline } = getDeletedAccountRestoreState(
            existingSeoAccount.user,
          );
          if (!canRestore) {
            throw new Error("Account has been permanently deleted");
          }

          return buildAuthPayload(existingSeoAccount.user, {
            restoreRequired: true,
            restoreDeadline,
          });
        }

        const activeUser = await ensureUserCanLogin(existingSeoAccount.user);
        const refreshedUser = await (prisma as any).user.update({
          where: { id: activeUser.id },
          data: {
            displayName: activeUser.displayName || derivedDisplayName,
            emailVerified: true,
            linkedSEOs: includeProviderInLinkedSeos(
              activeUser.linkedSEOs,
              provider,
            ),
          },
        });

        await ensureWorkspaceForUserId(refreshedUser.id, refreshedUser.id);
        return buildAuthPayload(refreshedUser);
      }

      const existingUserByEmail = await (prisma as any).user.findFirst({
        where: { email },
      });

      if (existingUserByEmail) {
        if (existingUserByEmail.deleted) {
          const { canRestore, restoreDeadline } =
            getDeletedAccountRestoreState(existingUserByEmail);
          if (!canRestore) {
            throw new Error("Account has been permanently deleted");
          }

          return buildAuthPayload(existingUserByEmail, {
            restoreRequired: true,
            restoreDeadline,
          });
        }

        const activeUser = await ensureUserCanLogin(existingUserByEmail);

        await (prisma as any).seoAccount
          .create({
            data: {
              userId: activeUser.id,
              provider,
              providerUserId,
            },
          })
          .catch((error: unknown) => {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              return null;
            }

            throw error;
          });

        const updatedUser = await (prisma as any).user.update({
          where: { id: activeUser.id },
          data: {
            displayName: activeUser.displayName || derivedDisplayName,
            emailVerified: true,
            linkedSEOs: includeProviderInLinkedSeos(
              activeUser.linkedSEOs,
              provider,
            ),
          },
        });

        await ensureWorkspaceForUserId(updatedUser.id, updatedUser.id);
        return buildAuthPayload(updatedUser);
      }

      const emailLocalPart = email.split("@")[0] || "user";
      const username = await generateUniqueUsername(emailLocalPart);
      const generatedPassword = randomBytes(32).toString("hex");
      const password = await bcrypt.hash(generatedPassword, 12);

      const createdUser = await (prisma as any).user.create({
        data: {
          email,
          password,
          username,
          displayName: derivedDisplayName,
          emailVerified: true,
          linkedSEOs: [provider],
          seoAccounts: {
            create: {
              provider,
              providerUserId,
            },
          },
          workspace: {
            create: {
              name: "My Workspace",
            },
          },
        },
      });

      return buildAuthPayload(createdUser);
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

      const user = await (prisma as any).user.findFirst({
        where: { email, deleted: false, disabled: false },
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
    requestEmailChange: async (
      _: unknown,
      { newEmail }: { newEmail: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      try {
        await beginPendingEmailChange(ctx.user.sub, newEmail);
      } catch (error) {
        console.error("[requestEmailChange] Failed", {
          userId: ctx.user.sub,
          newEmail,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : error,
        });
        throw error;
      }

      return true;
    },
    changePassword: async (
      _: unknown,
      {
        currentPassword,
        newPassword,
      }: { currentPassword: string; newPassword: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const currentPasswordValue = String(currentPassword || "");
      const newPasswordValue = String(newPassword || "");

      if (!currentPasswordValue || !newPasswordValue) {
        throw new Error("Current password and new password are required");
      }

      if (newPasswordValue.length < 8) {
        throw new Error("New password must be at least 8 characters");
      }

      if (currentPasswordValue === newPasswordValue) {
        throw new Error(
          "New password must be different from your current password",
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.user.sub },
        select: {
          id: true,
          email: true,
          password: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const passwordMatches = await bcrypt.compare(
        currentPasswordValue,
        user.password,
      );

      if (!passwordMatches) {
        throw new Error("Current password is incorrect");
      }

      const nextPasswordHash = await bcrypt.hash(newPasswordValue, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: nextPasswordHash,
        },
      });

      try {
        await sendPasswordChangedEmail(user.email);
      } catch (error) {
        console.error("[changePassword] Failed to send confirmation email", {
          userId: user.id,
          email: user.email,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : error,
        });
      }

      return true;
    },
    verifyPendingEmailChange: async (
      _: unknown,
      { code }: { code: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      if (!code) {
        throw new Error("Verification code is required");
      }

      return verifyPendingEmailChange(ctx.user.sub, code);
    },
    resendPendingEmailChange: async (_: unknown, __: unknown, ctx: any) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      return resendPendingEmailChange(ctx.user.sub);
    },
    deleteMyAccount: async (_: unknown, __: unknown, ctx: any) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.user.sub },
        select: { id: true, email: true },
      });
      if (!user) {
        throw new Error("User not found");
      }

      const deletedAt = new Date();
      const restoreDeadline = new Date(
        deletedAt.getTime() + ACCOUNT_RESTORE_WINDOW_MS,
      );

      await (prisma as any).user.update({
        where: { id: user.id },
        data: {
          deleted: true,
          deletedAt,
          disabled: false,
          disabledAt: null,
          disabledUntil: null,
        },
      });

      void sendAccountDeletedEmail(user.email, restoreDeadline).catch(
        (error) => {
          console.error("[deleteMyAccount] Failed to send deletion email", {
            userId: user.id,
            error,
          });
        },
      );

      return true;
    },
    restoreDeletedAccount: async (_: unknown, __: unknown, ctx: any) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.user.sub },
      });
      if (!user) {
        throw new Error("User not found");
      }

      if (!user.deleted) {
        return user;
      }

      const { canRestore } = getDeletedAccountRestoreState(user);
      if (!canRestore) {
        throw new Error("Account has been permanently deleted");
      }

      const restoredUser = await (prisma as any).user.update({
        where: { id: user.id },
        data: {
          deleted: false,
          deletedAt: null,
        },
      });

      void sendAccountRecoveredEmail(restoredUser.email).catch((error) => {
        console.error("[restoreDeletedAccount] Failed to send recovery email", {
          userId: restoredUser.id,
          error,
        });
      });

      return restoredUser;
    },
    disableMyAccount: async (
      _: unknown,
      { until }: { until?: string | null },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const disabledUntil = until ? new Date(until) : null;
      if (disabledUntil && Number.isNaN(disabledUntil.getTime())) {
        throw new Error("Invalid disable until date");
      }

      await (prisma as any).user.update({
        where: { id: ctx.user.sub },
        data: {
          disabled: true,
          disabledAt: new Date(),
          disabledUntil,
        },
      });

      return true;
    },
    reactivateMyAccount: async (_: unknown, __: unknown, ctx: any) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      await (prisma as any).user.update({
        where: { id: ctx.user.sub },
        data: {
          disabled: false,
          disabledAt: null,
          disabledUntil: null,
        },
      });

      return true;
    },
    updateVisibilitySettings: async (
      _: unknown,
      {
        visibilityPublicProfile,
        visibilityPublicPosts,
        visibilityPublicComments,
        visibilityOnlineStatus,
      }: {
        visibilityPublicProfile: boolean;
        visibilityPublicPosts: boolean;
        visibilityPublicComments: boolean;
        visibilityOnlineStatus: boolean;
      },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const normalizedVisibilityPublicPosts = visibilityPublicProfile
        ? visibilityPublicPosts
        : false;

      return (prisma as any).user.update({
        where: { id: ctx.user.sub },
        data: {
          visibilityPublicProfile,
          visibilityPublicPosts: normalizedVisibilityPublicPosts,
          visibilityPublicComments,
          visibilityOnlineStatus,
        },
      });
    },
    followUser: async (
      _: unknown,
      { username }: { username: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const normalizedUsername = String(username || "").trim();
      if (!normalizedUsername) {
        throw new Error("Username is required");
      }

      const targetUser = await (prisma as any).user.findFirst({
        where: {
          username: {
            equals: normalizedUsername,
            mode: "insensitive",
          },
          deleted: false,
          disabled: false,
        },
        select: { id: true, visibilityPublicProfile: true },
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      if (targetUser.id === ctx.user.sub) {
        throw new Error("You cannot follow yourself");
      }

      const actor = await (prisma as any).user.findUnique({
        where: { id: ctx.user.sub },
        select: { displayName: true, username: true, profilePicture: true },
      });
      const actorLabel =
        actor?.displayName?.trim() || actor?.username?.trim() || "Someone";

      // Private profile: create a follow request instead of a direct follow
      if (!targetUser.visibilityPublicProfile) {
        // Check if already following
        const existingFollow = await (prisma as any).follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: ctx.user.sub,
              followingId: targetUser.id,
            },
          },
        });
        if (existingFollow) {
          return { followed: true, pending: false };
        }

        // Upsert follow request (reset if previously declined/expired)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await (prisma as any).followRequest.upsert({
          where: {
            requesterId_targetId: {
              requesterId: ctx.user.sub,
              targetId: targetUser.id,
            },
          },
          update: {
            status: "PENDING",
            expiresAt,
          },
          create: {
            requesterId: ctx.user.sub,
            targetId: targetUser.id,
            status: "PENDING",
            expiresAt,
          },
        });

        await createNotification({
          userId: targetUser.id,
          actorId: ctx.user.sub,
          type: NOTIFICATION_TYPE.FOLLOW_REQUEST,
          title: "Follow request",
          description: `${actorLabel} wants to follow you.`,
          icon: NOTIFICATION_ICON.FOLLOW_REQUEST,
          profilePicture: actor?.profilePicture,
        });

        return { followed: false, pending: true };
      }

      // Public profile: direct follow
      await (prisma as any).follow.upsert({
        where: {
          followerId_followingId: {
            followerId: ctx.user.sub,
            followingId: targetUser.id,
          },
        },
        update: {},
        create: {
          followerId: ctx.user.sub,
          followingId: targetUser.id,
        },
      });

      if (targetUser.id !== ctx.user.sub) {
        await createNotification({
          userId: targetUser.id,
          actorId: ctx.user.sub,
          type: NOTIFICATION_TYPE.FOLLOW,
          title: "New follower",
          description: `${actorLabel} started following you.`,
          icon: NOTIFICATION_ICON.FOLLOW,
          profilePicture: actor?.profilePicture,
        });
      }

      return { followed: true, pending: false };
    },
    unfollowUser: async (
      _: unknown,
      { username }: { username: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const normalizedUsername = String(username || "").trim();
      if (!normalizedUsername) {
        throw new Error("Username is required");
      }

      const targetUser = await (prisma as any).user.findFirst({
        where: {
          username: {
            equals: normalizedUsername,
            mode: "insensitive",
          },
          deleted: false,
          disabled: false,
        },
        select: { id: true },
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      await (prisma as any).follow.deleteMany({
        where: {
          followerId: ctx.user.sub,
          followingId: targetUser.id,
        },
      });

      // Also remove any pending follow request
      await (prisma as any).followRequest.deleteMany({
        where: {
          requesterId: ctx.user.sub,
          targetId: targetUser.id,
        },
      });

      await (prisma as any).notification.deleteMany({
        where: {
          userId: targetUser.id,
          actorId: ctx.user.sub,
          type: {
            in: [NOTIFICATION_TYPE.FOLLOW, NOTIFICATION_TYPE.FOLLOW_REQUEST],
          },
        },
      });

      return true;
    },
    acceptFollowRequest: async (
      _: unknown,
      { requestId }: { requestId: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const normalizedId = String(requestId || "").trim();
      if (!normalizedId) {
        throw new Error("requestId is required");
      }

      const request = await (prisma as any).followRequest.findUnique({
        where: { id: normalizedId },
        select: {
          id: true,
          requesterId: true,
          targetId: true,
          status: true,
          expiresAt: true,
        },
      });

      if (!request || request.targetId !== ctx.user.sub) {
        throw new Error("Follow request not found");
      }

      if (request.status !== "PENDING") {
        throw new Error("Follow request is no longer pending");
      }

      if (new Date(request.expiresAt) < new Date()) {
        await (prisma as any).followRequest.update({
          where: { id: normalizedId },
          data: { status: "EXPIRED" },
        });
        throw new Error("Follow request has expired");
      }

      // Accept: create the follow, mark request accepted
      await (prisma as any).follow.upsert({
        where: {
          followerId_followingId: {
            followerId: request.requesterId,
            followingId: request.targetId,
          },
        },
        update: {},
        create: {
          followerId: request.requesterId,
          followingId: request.targetId,
        },
      });

      await (prisma as any).followRequest.update({
        where: { id: normalizedId },
        data: { status: "ACCEPTED" },
      });

      // Remove the follow request notification
      await (prisma as any).notification.deleteMany({
        where: {
          userId: ctx.user.sub,
          actorId: request.requesterId,
          type: NOTIFICATION_TYPE.FOLLOW_REQUEST,
        },
      });

      // Notify the requester that their request was accepted
      const actor = await (prisma as any).user.findUnique({
        where: { id: ctx.user.sub },
        select: { displayName: true, username: true, profilePicture: true },
      });
      const actorLabel =
        actor?.displayName?.trim() || actor?.username?.trim() || "Someone";

      await createNotification({
        userId: request.requesterId,
        actorId: ctx.user.sub,
        type: NOTIFICATION_TYPE.FOLLOW,
        title: "Follow request accepted",
        description: `${actorLabel} accepted your follow request.`,
        icon: NOTIFICATION_ICON.FOLLOW,
        profilePicture: actor?.profilePicture,
      });

      return true;
    },
    declineFollowRequest: async (
      _: unknown,
      { requestId }: { requestId: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const normalizedId = String(requestId || "").trim();
      if (!normalizedId) {
        throw new Error("requestId is required");
      }

      const request = await (prisma as any).followRequest.findUnique({
        where: { id: normalizedId },
        select: { id: true, requesterId: true, targetId: true },
      });

      if (!request || request.targetId !== ctx.user.sub) {
        throw new Error("Follow request not found");
      }

      await (prisma as any).followRequest.update({
        where: { id: normalizedId },
        data: { status: "DECLINED" },
      });

      // Remove the follow request notification
      await (prisma as any).notification.deleteMany({
        where: {
          userId: ctx.user.sub,
          actorId: request.requesterId,
          type: NOTIFICATION_TYPE.FOLLOW_REQUEST,
        },
      });

      return true;
    },
    cancelFollowRequest: async (
      _: unknown,
      { username }: { username: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const normalizedUsername = String(username || "").trim();
      if (!normalizedUsername) {
        throw new Error("Username is required");
      }

      const targetUser = await (prisma as any).user.findFirst({
        where: {
          username: {
            equals: normalizedUsername,
            mode: "insensitive",
          },
          deleted: false,
          disabled: false,
        },
        select: { id: true },
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      await (prisma as any).followRequest.deleteMany({
        where: {
          requesterId: ctx.user.sub,
          targetId: targetUser.id,
        },
      });

      await (prisma as any).notification.deleteMany({
        where: {
          userId: targetUser.id,
          actorId: ctx.user.sub,
          type: NOTIFICATION_TYPE.FOLLOW_REQUEST,
        },
      });

      return true;
    },
    muteUser: async (
      _: unknown,
      { username }: { username: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const normalizedUsername = String(username || "").trim();
      if (!normalizedUsername) {
        throw new Error("Username is required");
      }

      const targetUser = await (prisma as any).user.findFirst({
        where: {
          username: {
            equals: normalizedUsername,
            mode: "insensitive",
          },
          deleted: false,
          disabled: false,
        },
        select: { id: true },
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      if (targetUser.id === ctx.user.sub) {
        throw new Error("You cannot mute yourself");
      }

      await (prisma as any).mute.upsert({
        where: {
          muterId_mutedId: {
            muterId: ctx.user.sub,
            mutedId: targetUser.id,
          },
        },
        update: {},
        create: {
          muterId: ctx.user.sub,
          mutedId: targetUser.id,
        },
      });

      return true;
    },
    unmuteUser: async (
      _: unknown,
      { username }: { username: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const normalizedUsername = String(username || "").trim();
      if (!normalizedUsername) {
        throw new Error("Username is required");
      }

      const targetUser = await (prisma as any).user.findFirst({
        where: {
          username: {
            equals: normalizedUsername,
            mode: "insensitive",
          },
          deleted: false,
          disabled: false,
        },
        select: { id: true },
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      await (prisma as any).mute.deleteMany({
        where: {
          muterId: ctx.user.sub,
          mutedId: targetUser.id,
        },
      });

      return true;
    },
    blockUser: async (
      _: unknown,
      { username }: { username: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const normalizedUsername = String(username || "").trim();
      if (!normalizedUsername) {
        throw new Error("Username is required");
      }

      const targetUser = await (prisma as any).user.findFirst({
        where: {
          username: {
            equals: normalizedUsername,
            mode: "insensitive",
          },
          deleted: false,
          disabled: false,
        },
        select: { id: true },
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      if (targetUser.id === ctx.user.sub) {
        throw new Error("You cannot block yourself");
      }

      const blockedUserIds = await getBlockedUserIdsForViewer(ctx.user.sub);

      if (!blockedUserIds.includes(targetUser.id)) {
        await prisma.$transaction([
          (prisma as any).user.update({
            where: { id: ctx.user.sub },
            data: {
              blockedUserIds: {
                push: targetUser.id,
              },
            },
          }),
          (prisma as any).follow.deleteMany({
            where: {
              OR: [
                {
                  followerId: ctx.user.sub,
                  followingId: targetUser.id,
                },
                {
                  followerId: targetUser.id,
                  followingId: ctx.user.sub,
                },
              ],
            },
          }),
        ]);
      }

      return true;
    },
    unblockUser: async (
      _: unknown,
      { username }: { username: string },
      ctx: any,
    ) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const normalizedUsername = String(username || "").trim();
      if (!normalizedUsername) {
        throw new Error("Username is required");
      }

      const targetUser = await (prisma as any).user.findFirst({
        where: {
          username: {
            equals: normalizedUsername,
            mode: "insensitive",
          },
          deleted: false,
          disabled: false,
        },
        select: { id: true },
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      const blockedUserIds = (
        await getBlockedUserIdsForViewer(ctx.user.sub)
      ).filter((blockedUserId: string) => blockedUserId !== targetUser.id);

      await (prisma as any).user.update({
        where: { id: ctx.user.sub },
        data: {
          blockedUserIds,
        },
      });

      return true;
    },

    completeProfile: async (_: unknown, args: any, ctx: any) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const username = args.username?.trim();
      const displayName = args.displayName?.trim();
      const institution = args.institution?.trim();
      const profilePicture = args.profilePicture?.trim();
      const profileBackground = args.profileBackground?.trim();
      const profileBackgroundFileBase64 = args.profileBackgroundFileBase64;
      const profileBackgroundFileName = args.profileBackgroundFileName?.trim();
      const profileBackgroundMimeType = args.profileBackgroundMimeType?.trim();
      const profilePictureFileBase64 = args.profilePictureFileBase64;
      const profilePictureFileName = args.profilePictureFileName?.trim();
      const profilePictureMimeType = args.profilePictureMimeType?.trim();
      const hasProfilePictureArg = Object.prototype.hasOwnProperty.call(
        args,
        "profilePicture",
      );
      const hasProfilePictureFile =
        typeof profilePictureFileBase64 === "string" &&
        profilePictureFileBase64.trim().length > 0;
      const hasProfileBackgroundArg = Object.prototype.hasOwnProperty.call(
        args,
        "profileBackground",
      );
      const hasProfileBackgroundFile =
        typeof profileBackgroundFileBase64 === "string" &&
        profileBackgroundFileBase64.trim().length > 0;

      if (!username || !displayName || !institution) {
        throw new Error("Username, display name, and institution are required");
      }

      if (RESERVED_USERNAMES.has(username.toLowerCase())) {
        throw new Error("This username is reserved");
      }

      const existingUser = await (prisma as any).user.findUnique({
        where: { id: ctx.user.sub },
        select: {
          profilePicture: true,
          profileBackground: true,
          subscriptionPlan: true,
        },
      });
      if (!existingUser) {
        throw new Error("User not found");
      }

      let uploadedProfilePictureUrl: string | null = null;
      let uploadedProfileBackgroundUrl: string | null = null;

      try {
        const updateData: Record<string, unknown> = {
          username,
          displayName,
          institution,
          program: args.program ?? null,
        };

        const isProUser =
          existingUser.subscriptionPlan?.trim().toLowerCase() === "pro";

        if (hasProfileBackgroundFile && !isProUser) {
          throw new Error(
            "Profile backgrounds are available to Pro users only",
          );
        }

        if (hasProfileBackgroundFile) {
          if (!profileBackgroundFileName || !profileBackgroundMimeType) {
            throw new Error(
              "Profile background file name and mime type are required",
            );
          }

          const normalizedBackgroundMime =
            profileBackgroundMimeType.toLowerCase();
          if (
            !ALLOWED_PROFILE_BACKGROUND_MIME_TYPES.has(normalizedBackgroundMime)
          ) {
            throw new Error("Use JPG, PNG, WEBP, or GIF only.");
          }

          const backgroundBuffer = Buffer.from(
            profileBackgroundFileBase64,
            "base64",
          );
          if (!backgroundBuffer.length) {
            throw new Error("Uploaded profile background is empty");
          }
          if (backgroundBuffer.length > MAX_PROFILE_BACKGROUND_BYTES) {
            throw new Error("Profile background must be 5MB or smaller");
          }

          const bucket = process.env.AWS_S3_BUCKET_NAME;
          const region = process.env.AWS_REGION;
          if (!bucket || !region) {
            throw new Error("S3 bucket configuration is missing");
          }

          const fileNameWithoutExtension = profileBackgroundFileName.replace(
            /\.[^.]+$/,
            "",
          );
          const sanitizedBaseName = sanitizeFileName(fileNameWithoutExtension);
          const extension =
            normalizedBackgroundMime === "image/jpeg"
              ? "jpg"
              : normalizedBackgroundMime === "image/png"
                ? "png"
                : normalizedBackgroundMime === "image/webp"
                  ? "webp"
                  : "gif";
          const key = `profileBackgrounds/${Date.now()}-${randomUUID()}-${sanitizedBaseName || "profile-background"}.${extension}`;
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: backgroundBuffer,
              ContentType: normalizedBackgroundMime,
            }),
          );

          uploadedProfileBackgroundUrl = buildS3FileUrl(bucket, region, key);
          updateData.profileBackground = uploadedProfileBackgroundUrl;
        } else if (hasProfileBackgroundArg) {
          if (
            !profileBackground ||
            profileBackground === DEFAULT_PROFILE_BACKGROUND
          ) {
            updateData.profileBackground = DEFAULT_PROFILE_BACKGROUND;
          } else if (!isProUser) {
            throw new Error(
              "Profile backgrounds are available to Pro users only",
            );
          }
        }

        if (hasProfilePictureFile) {
          if (!profilePictureFileName || !profilePictureMimeType) {
            throw new Error(
              "Profile picture file name and mime type are required",
            );
          }

          const normalizedMime = profilePictureMimeType.toLowerCase();
          if (!ALLOWED_PROFILE_PICTURE_MIME_TYPES.has(normalizedMime)) {
            throw new Error("Use JPG, JPEG, or PNG only.");
          }

          const fileBuffer = Buffer.from(profilePictureFileBase64, "base64");
          if (!fileBuffer.length) {
            throw new Error("Uploaded profile picture is empty");
          }
          if (fileBuffer.length > MAX_PROFILE_PICTURE_BYTES) {
            throw new Error("Profile picture must be 5MB or smaller");
          }

          let processedImageBuffer: Buffer;
          try {
            processedImageBuffer = await sharp(fileBuffer)
              .rotate()
              .resize({
                width: PROFILE_PICTURE_MAX_DIMENSION,
                height: PROFILE_PICTURE_MAX_DIMENSION,
                fit: "inside",
                withoutEnlargement: true,
              })
              .webp({ quality: PROFILE_PICTURE_WEBP_QUALITY })
              .toBuffer();
          } catch {
            throw new Error("Failed to process profile picture");
          }

          const bucket = process.env.AWS_S3_BUCKET_NAME;
          const region = process.env.AWS_REGION;
          if (!bucket || !region) {
            throw new Error("S3 bucket configuration is missing");
          }

          const fileNameWithoutExtension = profilePictureFileName.replace(
            /\.[^.]+$/,
            "",
          );
          const sanitizedBaseName = sanitizeFileName(fileNameWithoutExtension);
          const key = `profilePictures/${Date.now()}-${randomUUID()}-${sanitizedBaseName || "profile"}.webp`;
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: processedImageBuffer,
              ContentType: "image/webp",
            }),
          );

          uploadedProfilePictureUrl = buildS3FileUrl(bucket, region, key);
          updateData.profilePicture = uploadedProfilePictureUrl;
        } else if (hasProfilePictureArg) {
          updateData.profilePicture = profilePicture || null;
        }

        const updatedUser = await (prisma as any).user.update({
          where: { id: ctx.user.sub },
          data: updateData,
        });

        if (hasProfilePictureFile && existingUser.profilePicture) {
          const previousPictureKey = extractS3KeyFromUrl(
            existingUser.profilePicture,
            process.env.AWS_S3_BUCKET_NAME ?? "",
            process.env.AWS_REGION ?? "",
          );
          const bucket = process.env.AWS_S3_BUCKET_NAME;

          if (
            previousPictureKey &&
            bucket &&
            existingUser.profilePicture !== uploadedProfilePictureUrl
          ) {
            void s3
              .send(
                new DeleteObjectCommand({
                  Bucket: bucket,
                  Key: previousPictureKey,
                }),
              )
              .catch(() => null);
          }
        }

        if (
          (hasProfileBackgroundFile ||
            updateData.profileBackground === DEFAULT_PROFILE_BACKGROUND) &&
          existingUser.profileBackground &&
          existingUser.profileBackground !== DEFAULT_PROFILE_BACKGROUND
        ) {
          const previousBackgroundKey = extractS3KeyFromUrl(
            existingUser.profileBackground,
            process.env.AWS_S3_BUCKET_NAME ?? "",
            process.env.AWS_REGION ?? "",
          );
          const bucket = process.env.AWS_S3_BUCKET_NAME;

          if (
            previousBackgroundKey &&
            bucket &&
            existingUser.profileBackground !== uploadedProfileBackgroundUrl
          ) {
            void s3
              .send(
                new DeleteObjectCommand({
                  Bucket: bucket,
                  Key: previousBackgroundKey,
                }),
              )
              .catch(() => null);
          }
        }

        return updatedUser;
      } catch (error) {
        if (uploadedProfilePictureUrl) {
          const bucket = process.env.AWS_S3_BUCKET_NAME;
          const region = process.env.AWS_REGION;
          if (bucket && region) {
            const uploadedPictureKey = extractS3KeyFromUrl(
              uploadedProfilePictureUrl,
              bucket,
              region,
            );
            if (uploadedPictureKey) {
              void s3
                .send(
                  new DeleteObjectCommand({
                    Bucket: bucket,
                    Key: uploadedPictureKey,
                  }),
                )
                .catch(() => null);
            }
          }
        }

        if (uploadedProfileBackgroundUrl) {
          const bucket = process.env.AWS_S3_BUCKET_NAME;
          const region = process.env.AWS_REGION;
          if (bucket && region) {
            const uploadedBackgroundKey = extractS3KeyFromUrl(
              uploadedProfileBackgroundUrl,
              bucket,
              region,
            );
            if (uploadedBackgroundKey) {
              void s3
                .send(
                  new DeleteObjectCommand({
                    Bucket: bucket,
                    Key: uploadedBackgroundKey,
                  }),
                )
                .catch(() => null);
            }
          }
        }

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
    pendingEmail: async (user: {
      id: string;
      pendingEmail?: string | null;
      emailVerificationTokenExpiresAt?: Date | string | null;
    }) => getVisiblePendingEmail(user),
    visibilityPublicProfile: (user: {
      visibilityPublicProfile?: boolean | null;
    }) => user.visibilityPublicProfile ?? true,
    visibilityPublicPosts: (user: { visibilityPublicPosts?: boolean | null }) =>
      user.visibilityPublicPosts ?? true,
    visibilityPublicComments: (user: {
      visibilityPublicComments?: boolean | null;
    }) => user.visibilityPublicComments ?? true,
    visibilityOnlineStatus: (user: {
      visibilityOnlineStatus?: boolean | null;
    }) => user.visibilityOnlineStatus ?? true,
    profilePicture: async (user: { profilePicture?: string | null }) => {
      const rawProfilePicture = user.profilePicture?.trim();
      if (!rawProfilePicture) {
        return null;
      }

      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION;
      if (!bucket || !region) {
        return rawProfilePicture;
      }

      const key = extractS3KeyFromUrl(rawProfilePicture, bucket, region);
      if (!key) {
        return rawProfilePicture;
      }

      try {
        return await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
          { expiresIn: PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS },
        );
      } catch {
        return rawProfilePicture;
      }
    },
    profileBackground: async (user: { profileBackground?: string | null }) => {
      const rawProfileBackground = user.profileBackground?.trim();
      if (!rawProfileBackground) {
        return DEFAULT_PROFILE_BACKGROUND;
      }

      if (rawProfileBackground === DEFAULT_PROFILE_BACKGROUND) {
        return rawProfileBackground;
      }

      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION;
      if (!bucket || !region) {
        return rawProfileBackground;
      }

      const key = extractS3KeyFromUrl(rawProfileBackground, bucket, region);
      if (!key) {
        return rawProfileBackground;
      }

      try {
        return await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
          { expiresIn: PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS },
        );
      } catch {
        return rawProfileBackground;
      }
    },
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
    mutedUsers: async (user: { id: string }) => {
      const mutes = await (prisma as any).mute.findMany({
        where: { muterId: user.id },
        include: { muted: true },
        orderBy: { createdAt: "desc" },
      });

      return mutes.map((entry: { muted: unknown }) => entry.muted);
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
    createdAt: (user: { createdAt?: unknown }) =>
      toIsoStringOrNull(user.createdAt),
    deletedAt: (user: { deletedAt?: unknown }) =>
      toIsoStringOrNull(user.deletedAt),
    disabledAt: (user: { disabledAt?: unknown }) =>
      toIsoStringOrNull(user.disabledAt),
    disabledUntil: (user: { disabledUntil?: unknown }) =>
      toIsoStringOrNull(user.disabledUntil),
    subscriptionStartedAt: (user: { subscriptionStartedAt?: unknown }) =>
      toIsoStringOrNull(user.subscriptionStartedAt),
    subscriptionEndsAt: (user: { subscriptionEndsAt?: unknown }) =>
      toIsoStringOrNull(user.subscriptionEndsAt),
  },
};
