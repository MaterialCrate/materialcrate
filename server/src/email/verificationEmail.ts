import { renderEmailLayout } from "./layout.js";
import { sendEmail } from "./shared.js";

export type VerificationEmailVariant = "signup" | "emailChange";

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

  const html = renderEmailLayout({
    eyebrow,
    heading,
    body,
    content: `
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
    `,
  });

  return { subject, text, html };
};

export const sendVerificationEmail = async (
  email: string,
  token: string,
  variant: VerificationEmailVariant = "signup",
) => {
  if (!process.env.MAIL_FROM || !process.env.SES_USER || !process.env.SES_PASS) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[email] Delivery is not configured. Verification code for ${email}: ${token}`,
      );
      return;
    }
  }

  const content = getVerificationEmailContent(token, variant);
  await sendEmail({ to: email, ...content });
};
