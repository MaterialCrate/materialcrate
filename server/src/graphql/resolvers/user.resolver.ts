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
  sendVerificationEmailForUser,
  verifyEmailCode,
} from "../../auth/emailVerification";
import { ensureWorkspaceForUserId } from "./workspace.resolver";

const createToken = (userId: string, email: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ sub: userId, email }, secret, { expiresIn: "7d" });
};

const RESERVED_USERNAMES = new Set(["deleted", "disabled"]);
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const SOCIAL_PROVIDER_MAP = {
  google: "GOOGLE",
  facebook: "FACEBOOK",
} as const;

type SocialProviderKey = keyof typeof SOCIAL_PROVIDER_MAP;
type SocialProviderValue = (typeof SOCIAL_PROVIDER_MAP)[SocialProviderKey];

const normalizeSocialProvider = (provider: unknown): SocialProviderValue => {
  const normalized = String(provider || "").trim().toLowerCase();
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

const ensureUserCanLogin = async (user: any) => {
  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (user.deleted) {
    throw new Error("Account has been deleted");
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

export const UserResolver = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: any) => {
      if (!ctx.user?.sub) return null;
      const user = await prisma.user.findUnique({ where: { id: ctx.user.sub } });
      if (!user) return null;
      await ensureWorkspaceForUserId(user.id, ctx.user.sub);
      return user;
    },

    user: async (_: unknown, { id }: { id: string }) => {
      return prisma.user.findUnique({ where: { id } });
    },

    userByUsername: async (_: unknown, { username }: { username: string }) => {
      const normalizedUsername = String(username || "").trim();
      if (!normalizedUsername) {
        return null;
      }

      return (prisma as any).user.findFirst({
        where: {
          username: {
            equals: normalizedUsername,
            mode: "insensitive",
          },
          deleted: false,
          disabled: false,
        },
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
      const trimmedEmail = String(email || "").trim().toLowerCase();
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
  },

  Mutation: {
    signup: async (_: unknown, args: any) => {
      const { email, password, username, displayName, institution, program } = args;
      const normalizedUsername = username?.trim();
      const normalizedDisplayName = displayName?.trim();

      if (!email || !password || !normalizedUsername || !normalizedDisplayName) {
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

      const user = await prisma.user.create({
        data: {
          ...(createUserData as any),
          workspace: {
            create: {
              name: "My Workspace",
            },
          },
        },
      }).catch((error) => {
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
          error instanceof Error ? error.message : "Failed to send verification email";
        console.error("Failed to send verification email during signup:", error);
      }

      const token = createToken(user.id, user.email);
      return { token, user, verificationEmailSent, verificationEmailError };
    },

    login: async (_: unknown, args: any) => {
      const { email, password } = args;

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const user = await (prisma as any).user.findFirst({
        where: { email, deleted: false },
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

      if (user.deleted) {
        throw new Error("Account has been deleted");
      }

      if (!user.emailVerified) {
        throw new Error("Email is not verified");
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        throw new Error("Invalid credentials");
      }

      await ensureWorkspaceForUserId(user.id, user.id);

      const token = createToken(user.id, user.email);
        return {
          token,
          user,
          verificationEmailSent: true,
          verificationEmailError: null,
        };
    },
    socialAuth: async (_: unknown, args: any) => {
      const provider = normalizeSocialProvider(args.provider);
      const providerUserId = String(args.providerUserId || "").trim();
      const email = String(args.email || "").trim().toLowerCase();
      const displayName = String(args.displayName || "").trim();

      if (!providerUserId || !email) {
        throw new Error("providerUserId and email are required");
      }

      const derivedDisplayName = displayName || email.split("@")[0]?.trim() || "User";

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
        const token = createToken(refreshedUser.id, refreshedUser.email);
        return {
          token,
          user: refreshedUser,
          verificationEmailSent: true,
          verificationEmailError: null,
        };
      }

      const existingUserByEmail = await (prisma as any).user.findFirst({
        where: { email },
      });

      if (existingUserByEmail) {
        const activeUser = await ensureUserCanLogin(existingUserByEmail);

        await (prisma as any).seoAccount.create({
          data: {
            userId: activeUser.id,
            provider,
            providerUserId,
          },
        }).catch((error: unknown) => {
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
        const token = createToken(updatedUser.id, updatedUser.email);
        return {
          token,
          user: updatedUser,
          verificationEmailSent: true,
          verificationEmailError: null,
        };
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

      const token = createToken(createdUser.id, createdUser.email);
      return {
        token,
        user: createdUser,
        verificationEmailSent: true,
        verificationEmailError: null,
      };
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
    deleteMyAccount: async (_: unknown, __: unknown, ctx: any) => {
      if (!ctx.user?.sub) {
        throw new Error("Not authenticated");
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.user.sub },
        select: { id: true },
      });
      if (!user) {
        throw new Error("User not found");
      }

      await (prisma as any).user.update({
        where: { id: user.id },
        data: {
          deleted: true,
          deletedAt: new Date(),
          disabled: false,
          disabledAt: null,
          disabledUntil: null,
        },
      });

      return true;
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
        select: { id: true },
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      if (targetUser.id === ctx.user.sub) {
        throw new Error("You cannot follow yourself");
      }

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

      return true;
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

      if (!username || !displayName || !institution) {
        throw new Error(
          "Username, display name, and institution are required",
        );
      }

      if (RESERVED_USERNAMES.has(username.toLowerCase())) {
        throw new Error("This username is reserved");
      }

      const existingUser = await (prisma as any).user.findUnique({
        where: { id: ctx.user.sub },
        select: { profilePicture: true },
      });
      if (!existingUser) {
        throw new Error("User not found");
      }

      let uploadedProfilePictureUrl: string | null = null;

      try {
        const updateData: Record<string, unknown> = {
          username,
          displayName,
          institution,
          program: args.program ?? null,
        };

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
    createdAt: (user: { createdAt?: unknown }) => toIsoStringOrNull(user.createdAt),
    deletedAt: (user: { deletedAt?: unknown }) => toIsoStringOrNull(user.deletedAt),
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
