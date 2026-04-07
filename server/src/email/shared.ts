import { resend } from "../config/mailer.js";

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
  });

  if (error) {
    throw new Error(error.message);
  }
};
