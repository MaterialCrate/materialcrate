import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resend } from "../config/mailer.js";

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
      content_id: EMAIL_LOGO_CID,
    },
    {
      filename: "mc-wordmark.png",
      path: emailAssetPath("mc-wordmark.png"),
      content_id: EMAIL_WORDMARK_CID,
    },
  ]
    .filter((a) => existsSync(a.path))
    .map((a) => ({
      filename: a.filename,
      content: readFileSync(a.path).toString("base64"),
      content_id: a.content_id,
    }));

export const isEmailDeliveryConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

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

  const { error } = await resend.emails.send({
    from: formattedFrom,
    to,
    subject,
    text,
    html,
    attachments: getEmailAttachments(),
  });

  if (error) {
    throw new Error(error.message);
  }
};
