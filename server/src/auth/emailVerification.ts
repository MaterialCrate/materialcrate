import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  sendVerificationEmail,
  type VerificationEmailVariant,
} from "../email/verificationEmail.js";
import { sendPasswordChangedEmail } from "../email/passwordChangedEmail.js";

export { sendPasswordChangedEmail };

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const VERIFICATION_CODE_LENGTH = 4;

const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateVerificationCode = () => {
  const min = 10 ** (VERIFICATION_CODE_LENGTH - 1);
  const max = 10 ** VERIFICATION_CODE_LENGTH - 1;
  return String(crypto.randomInt(min, max + 1));
};

const normalizeEmail = (value: string) => String(value || "").trim().toLowerCase();

const isExpired = (value: Date | null | undefined) =>
  !value || value.getTime() <= Date.now();

const clearPendingEmailChangeState = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmail: null,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    },
  });
};

const clearExpiredPendingEmailClaim = async (email: string) => {
  await prisma.user.updateMany({
    where: {
      pendingEmail: {
        equals: email,
        mode: "insensitive",
      },
      OR: [
        {
          emailVerificationTokenExpiresAt: {
            lte: new Date(),
          },
        },
        {
          emailVerificationTokenExpiresAt: null,
        },
      ],
    },
    data: {
      pendingEmail: null,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    },
  });
};


export const issueEmailVerificationToken = async (userId: string) => {
  const verificationCode = generateVerificationCode();
  const tokenHash = hashToken(verificationCode);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiresAt: expiresAt,
    },
  });

  return verificationCode;
};

export const sendVerificationEmailForUser = async (
  userId: string,
  email: string,
) => {
  const rawToken = await issueEmailVerificationToken(userId);
  await sendVerificationEmail(email, rawToken, "signup");
};

export const beginPendingEmailChange = async (
  userId: string,
  nextEmail: string,
) => {
  const normalizedNextEmail = normalizeEmail(nextEmail);
  if (!normalizedNextEmail) {
    throw new Error("Email is required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (normalizeEmail(user.email) === normalizedNextEmail) {
    throw new Error("Enter a different email address");
  }

  await clearExpiredPendingEmailClaim(normalizedNextEmail);

  const existingUser = await prisma.user.findFirst({
    where: {
      id: { not: userId },
      deleted: false,
      OR: [
        {
          email: {
            equals: normalizedNextEmail,
            mode: "insensitive",
          },
        },
        {
          AND: [
            {
              pendingEmail: {
                equals: normalizedNextEmail,
                mode: "insensitive",
              },
            },
            {
              emailVerificationTokenExpiresAt: {
                gt: new Date(),
              },
            },
          ],
        },
      ],
    },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("Email already in use");
  }

  const verificationCode = generateVerificationCode();
  const tokenHash = hashToken(verificationCode);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmail: normalizedNextEmail,
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiresAt: expiresAt,
    },
  });

  try {
    await sendVerificationEmail(
      normalizedNextEmail,
      verificationCode,
      "emailChange",
    );
  } catch (error) {
    await clearPendingEmailChangeState(userId);

    throw error;
  }

  return normalizedNextEmail;
};

export const getVisiblePendingEmail = async (
  user: {
    id: string;
    pendingEmail?: string | null;
    emailVerificationTokenExpiresAt?: Date | string | null;
  },
) => {
  const pendingEmail = user.pendingEmail?.trim();
  if (!pendingEmail) {
    return null;
  }

  const expiresAt =
    user.emailVerificationTokenExpiresAt instanceof Date
      ? user.emailVerificationTokenExpiresAt
      : user.emailVerificationTokenExpiresAt
        ? new Date(user.emailVerificationTokenExpiresAt)
        : null;

  if (!isExpired(expiresAt)) {
    return pendingEmail;
  }

  await clearPendingEmailChangeState(user.id);
  return null;
};

export const verifyEmailToken = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired verification token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    },
  });

  return true;
};

export const verifyEmailCode = async (email: string, code: string) => {
  const tokenHash = hashToken(code);
  const user = await prisma.user.findFirst({
    where: {
      email,
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired verification code");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    },
  });

  return user;
};

export const resendPendingEmailChange = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      pendingEmail: true,
      emailVerificationTokenExpiresAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.pendingEmail || isExpired(user.emailVerificationTokenExpiresAt)) {
    if (user.pendingEmail) {
      await clearPendingEmailChangeState(user.id);
    }
    throw new Error("No pending email change found");
  }

  const rawToken = await issueEmailVerificationToken(userId);
  await sendVerificationEmail(user.pendingEmail, rawToken, "emailChange");
  return true;
};

export const verifyPendingEmailChange = async (userId: string, code: string) => {
  const tokenHash = hashToken(code);
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      pendingEmail: {
        not: null,
      },
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      pendingEmail: true,
    },
  });

  if (!user?.pendingEmail) {
    const stalePendingEmail = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pendingEmail: true,
        emailVerificationTokenExpiresAt: true,
      },
    });

    if (
      stalePendingEmail?.pendingEmail &&
      isExpired(stalePendingEmail.emailVerificationTokenExpiresAt)
    ) {
      await clearPendingEmailChangeState(stalePendingEmail.id);
    }

    throw new Error("Invalid or expired verification code");
  }

  const normalizedPendingEmail = normalizeEmail(user.pendingEmail);
  const existingUser = await prisma.user.findFirst({
    where: {
      id: { not: user.id },
      deleted: false,
      email: {
        equals: normalizedPendingEmail,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("Email already in use");
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      email: normalizedPendingEmail,
      pendingEmail: null,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    },
  });
};
