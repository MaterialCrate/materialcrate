import { renderEmailLayout } from "./layout.js";
import { isEmailDeliveryConfigured, sendEmail } from "./shared.js";

const getAccountRecoveredEmailContent = () => {
  const subject = "Your Material Crate account was restored";
  const eyebrow = "Account update";
  const heading = "Your account is active again";
  const body =
    "Your Material Crate account has been restored successfully. Your profile, posts, and account access are available again.";
  const footer =
    "If you did not restore this account, change your password immediately and review your recent sign-in activity.";

  const text = [heading, "", body, "", footer].join("\n");

  const html = renderEmailLayout({
    eyebrow,
    heading,
    body,
    content: `
      <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a9a9a;">
        Recovery confirmed
      </p>
      <div style="margin:18px 0 20px;padding:20px 16px;border-radius:22px;background:#fafafa;border:1px solid rgba(0,0,0,0.08);text-align:left;">
        <p style="margin:0;font-size:16px;line-height:1.7;font-weight:600;color:#202020;">
          Your account has been restored and is now visible again.
        </p>
        <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#5f5f5f;">
          ${footer}
        </p>
      </div>
    `,
  });

  return { subject, text, html };
};

export const sendAccountRecoveredEmail = async (email: string) => {
  if (!isEmailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[email] Delivery is not configured. Account recovery email skipped for ${email}`,
      );
      return;
    }
  }

  const content = getAccountRecoveredEmailContent();
  await sendEmail({ to: email, ...content });
};
