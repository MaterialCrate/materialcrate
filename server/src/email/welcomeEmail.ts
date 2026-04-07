import { renderEmailLayout } from "./layout.js";
import { isEmailDeliveryConfigured, sendEmail } from "./shared.js";

export const sendWelcomeEmail = async (
  email: string,
  displayName: string,
) => {
  if (!isEmailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[email] Delivery is not configured. Skipping welcome email for ${email}.`,
      );
      return;
    }
  }

  const firstName = displayName.split(" ")[0] ?? displayName;

  const text = [
    `Welcome to Material Crate, ${firstName}!`,
    "",
    "Your account is ready. Here's what you can do:",
    "",
    "• Upload and share PDF study material",
    "• Follow other students and researchers",
    "• Save posts to your workspace",
    "• Use AI to get help from PDF-based content",
    "",
    "Head to the app to get started.",
    "",
    "— The Material Crate team",
  ].join("\n");

  const html = renderEmailLayout({
    eyebrow: "Welcome",
    heading: `Welcome, ${firstName}.`,
    body: "Your Material Crate account is ready. Start sharing, saving, and studying.",
    content: `
      <p style="margin:0;font-size:14px;line-height:1.75;color:#5f5f5f;">
        Here's what you can do right now:
      </p>

      <div style="margin:20px 0;display:flex;flex-direction:column;gap:0;">
        ${[
          ["📄", "Upload and share PDF study material"],
          ["👥", "Follow other students and researchers"],
          ["🗂️", "Save posts to your personal workspace"],
          ["✨", "Use AI to get help from PDF-based content"],
        ]
          .map(
            ([icon, label]) => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
            <span style="font-size:18px;line-height:1;flex-shrink:0;">${icon}</span>
            <span style="font-size:14px;line-height:1.6;color:#202020;">${label}</span>
          </div>`,
          )
          .join("")}
      </div>

      <p style="margin:20px 0 0;font-size:14px;line-height:1.75;color:#5f5f5f;">
        If you have any questions, just reply to this email — we're happy to help.
      </p>
      <p style="margin:6px 0 0;font-size:14px;line-height:1.75;color:#5f5f5f;">
        — The Material Crate team
      </p>
    `,
  });

  await sendEmail({
    to: email,
    subject: `Welcome to Material Crate, ${firstName}!`,
    text,
    html,
  });
};
