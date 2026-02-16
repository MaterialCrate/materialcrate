import crypto from "crypto";
import { prisma } from "../config/prisma";
import { transporter } from "../config/mailer";

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

const getAppUrl = () => {
  return process.env.APP_URL ?? "http://localhost:3000";
};

const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const buildVerificationLink = (token: string) => {
  const baseUrl = getAppUrl().replace(/\/+$/, "");
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
};

export const issueEmailVerificationToken = async (userId: string) => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiresAt: expiresAt,
    },
  });

  return rawToken;
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const from = process.env.MAIL_FROM;
  if (!from) {
    throw new Error("MAIL_FROM is not configured");
  }

  const verificationLink = buildVerificationLink(token);

  await transporter.sendMail({
    from,
    to: email,
    subject: "Verify your Material Crate account",
    text: `Verify your email by opening this link: ${verificationLink}`,
    html: `<p>Verify your email by clicking <a href="${verificationLink}">this link</a>.</p>`,
  });
};

export const sendVerificationEmailForUser = async (
  userId: string,
  email: string,
) => {
  const rawToken = await issueEmailVerificationToken(userId);
  await sendVerificationEmail(email, rawToken);
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
