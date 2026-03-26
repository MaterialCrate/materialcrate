import crypto from "crypto";
import { fileURLToPath } from "node:url";
import { prisma } from "../config/prisma";
import { transporter } from "../config/mailer";

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const VERIFICATION_CODE_LENGTH = 4;
type VerificationEmailVariant = "signup" | "emailChange";
const EMAIL_LOGO_CID = "materialcrate-logo";
const EMAIL_WORDMARK_CID = "materialcrate-wordmark";

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

const isEmailDeliveryConfigured = () =>
  Boolean(process.env.MAIL_FROM && process.env.SES_USER && process.env.SES_PASS);

const emailAssetPath = (fileName: string) =>
  fileURLToPath(new URL(`../email/assets/${fileName}`, import.meta.url));

const getVerificationEmailContent = (
  token: string,
  variant: VerificationEmailVariant,
) => {
  const expiresLabel = "24 hours";
  const isEmailChange = variant === "emailChange";
  const subject = isEmailChange
    ? "Confirm your new Material Crate email"
    : "Verify your Material Crate account";
  const eyebrow = isEmailChange ? "Email change" : "Account verification";
  const heading = isEmailChange
    ? "Confirm your new email"
    : "Verify your email";
  const body = isEmailChange
    ? "Use this code to finish updating the email address you use to sign in to Material Crate."
    : "Use this code to activate your Material Crate account and complete signup.";
  const footer = isEmailChange
    ? "Your current sign-in email will stay the same until this code is confirmed."
    : "If you did not create an account, you can ignore this email.";

  const text = [
    heading,
    "",
    body,
    "",
    `Verification code: ${token}`,
    `Expires in ${expiresLabel}.`,
    "",
    footer,
  ].join("\n");

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f7f7f7;">
      <div style="max-width:560px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#202020;">
        <div style="margin-bottom:16px;padding:24px 28px;border-radius:28px;background:#1d1d1d;color:#ffffff;">
          <img
            src="cid:${EMAIL_LOGO_CID}"
            alt="Material Crate logo"
            width="44"
            height="44"
            style="display:block;width:44px;height:44px;border:0;outline:none;"
          />
          <p style="margin:18px 0 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.6);">
            ${eyebrow}
          </p>
          <h1 style="margin:10px 0 0;font-size:34px;line-height:1.05;font-weight:700;color:#ffffff;">
            ${heading}
          </h1>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.76);">
            ${body}
          </p>
        </div>
        <div style="padding:32px 28px;border:1px solid rgba(0,0,0,0.06);border-radius:28px;background:#ffffff;box-shadow:0 16px 40px rgba(0,0,0,0.04);">
          <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a9a9a;">
            Verification code
          </p>
          <div style="margin:18px 0 20px;padding:20px 16px;border-radius:22px;background:#fafafa;border:1px solid rgba(0,0,0,0.08);text-align:center;">
            <span style="display:inline-block;font-size:40px;line-height:1;font-weight:700;letter-spacing:0.28em;text-indent:0.28em;color:#202020;">
              ${token}
            </span>
          </div>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#5f5f5f;">
            This code expires in <strong style="color:#202020;">${expiresLabel}</strong>.
          </p>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#5f5f5f;">
            ${footer}
          </p>
        </div>
        <div style="margin:16px 8px 0;text-align:center;">
          <img
            src="cid:${EMAIL_WORDMARK_CID}"
            alt="Material Crate"
            width="168"
            style="display:inline-block;width:168px;max-width:100%;height:auto;border:0;outline:none;"
          />
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
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

export const sendVerificationEmail = async (
  email: string,
  token: string,
  variant: VerificationEmailVariant = "signup",
) => {
  const from = process.env.MAIL_FROM;
  if (!isEmailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[email] Delivery is not configured. Verification code for ${email}: ${token}`,
      );
      return;
    }

    throw new Error("Email delivery is not configured");
  }

  const content = getVerificationEmailContent(token, variant);

  await transporter.sendMail({
    from,
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
    attachments: [
      {
        filename: "logo-email.png",
        path: emailAssetPath("logo-email.png"),
        cid: EMAIL_LOGO_CID,
      },
      {
        filename: "mc-wordmark.png",
        path: emailAssetPath("mc-wordmark.png"),
        cid: EMAIL_WORDMARK_CID,
      },
    ],
  });
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

  return true;
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
