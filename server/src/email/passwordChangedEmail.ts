import { renderEmailLayout } from "./layout";
import { sendEmail } from "./shared";

const getPasswordChangedEmailContent = () => {
  const subject = "Your Material Crate password was changed";
  const eyebrow = "Security update";
  const heading = "Password updated";
  const body =
    "This is a confirmation that your Material Crate password was changed successfully.";
  const footer =
    "If you did not make this change, reset your password immediately and review your account activity.";

  const text = [heading, "", body, "", footer].join("\n");

  const html = renderEmailLayout({
    eyebrow,
    heading,
    body,
    content: `
      <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a9a9a;">
        Account security
      </p>
      <div style="margin:18px 0 20px;padding:20px 16px;border-radius:22px;background:#fafafa;border:1px solid rgba(0,0,0,0.08);text-align:left;">
        <p style="margin:0;font-size:16px;line-height:1.7;font-weight:600;color:#202020;">
          Your password has been updated.
        </p>
        <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#5f5f5f;">
          ${footer}
        </p>
      </div>
    `,
  });

  return { subject, text, html };
};

export const sendPasswordChangedEmail = async (email: string) => {
  if (!process.env.MAIL_FROM || !process.env.SES_USER || !process.env.SES_PASS) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[email] Delivery is not configured. Password change email skipped for ${email}`,
      );
      return;
    }
  }

  const content = getPasswordChangedEmailContent();
  await sendEmail({ to: email, ...content });
};
