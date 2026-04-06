import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transporter } from "../config/mailer.js";

export const EMAIL_LOGO_CID = "materialcrate-logo";
export const EMAIL_WORDMARK_CID = "materialcrate-wordmark";

const currentDir = dirname(fileURLToPath(import.meta.url));

const emailAssetPath = (fileName: string) => {
  const primaryPath = resolve(currentDir, "assets", fileName);
  if (existsSync(primaryPath)) {
    return primaryPath;
  }

  const sourcePath = resolve(
    currentDir,
    "..",
    "..",
    "src",
    "email",
    "assets",
    fileName,
  );
  if (existsSync(sourcePath)) {
    return sourcePath;
  }

  return primaryPath;
};

const getEmailAttachments = () =>
  [
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
  ].filter((attachment) => existsSync(attachment.path));

const getMailUser = () =>
  process.env.SMTP_USER?.trim() || process.env.SES_USER?.trim();

const getMailPass = () => process.env.SMTP_PASS || process.env.SES_PASS;

export const isEmailDeliveryConfigured = () =>
  Boolean(process.env.MAIL_FROM && getMailUser() && getMailPass());

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) => {
  const fromAddress = process.env.MAIL_FROM?.trim();
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "Material Crate";

  if (!isEmailDeliveryConfigured() || !fromAddress) {
    throw new Error("Email delivery is not configured");
  }

  const formattedFrom = fromAddress.includes("<")
    ? fromAddress
    : `${fromName} <${fromAddress}>`;

  await transporter.sendMail({
    from: formattedFrom,
    to,
    subject,
    text,
    html,
    attachments: getEmailAttachments(),
  });
};
