import { fileURLToPath } from "node:url";
import { transporter } from "../config/mailer.js";

export const EMAIL_LOGO_CID = "materialcrate-logo";
export const EMAIL_WORDMARK_CID = "materialcrate-wordmark";

const emailAssetPath = (fileName: string) =>
  fileURLToPath(new URL(`./assets/${fileName}`, import.meta.url));

const getEmailAttachments = () => [
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
];

export const isEmailDeliveryConfigured = () =>
  Boolean(process.env.MAIL_FROM && process.env.SES_USER && process.env.SES_PASS);

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
  const from = process.env.MAIL_FROM;

  if (!isEmailDeliveryConfigured()) {
    throw new Error("Email delivery is not configured");
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
    attachments: getEmailAttachments(),
  });
};
