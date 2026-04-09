import { renderEmailLayout } from "./layout.js";
import { isEmailDeliveryConfigured, sendEmail } from "./shared.js";

export const sendUploadReminderEmail = async (
  email: string,
  displayName: string,
) => {
  if (!isEmailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[email] Delivery is not configured. Skipping upload reminder email for ${email}.`,
      );
      return;
    }
  }

  const firstName = displayName.split(" ")[0] ?? displayName;
  const serverUrl = process.env.SERVER_URL?.trim().replace(/\/$/, "") ?? "";

  const text = [
    `Hey ${firstName}, got a new material helping you out?`,
    "",
    "Don't keep it to yourself — share it on Material Crate and help someone else study smarter.",
    "",
    "Every upload you share earns you tokens you can convert to real cash. The more views your material gets, the more you earn.",
    "",
    "• Upload a PDF or study material",
    "• Earn 1 token for every 5 views",
    "• Convert tokens to cash anytime",
    "",
    "Head to the app and upload something today.",
    "",
    `${serverUrl}/`,
    "",
    "— The Material Crate team",
    "",
    "Don't want these reminders? You can turn them off in Settings › Notifications › Email.",
  ].join("\n");

  const html = renderEmailLayout({
    eyebrow: "Weekly Reminder",
    heading: `Got a new material, ${firstName}?`,
    body: "Don't be greedy — share it with your friends and earn cash while you're at it.",
    content: `
      <p style="margin:0 0 20px;font-size:14px;line-height:1.75;color:#5f5f5f;">
        You haven't uploaded anything recently. If you've got study material sitting on your device that's been helpful to you, someone else out there needs it too.
      </p>

      <div style="margin:0 0 24px;padding:20px 22px;border-radius:18px;background:#FFF8F1;border:1px solid #FFE0C0;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#A95A13;">
          Here's the deal
        </p>
        <p style="margin:0;font-size:15px;font-weight:700;line-height:1.4;color:#202020;">
          Every 5 views your material gets = 1 token. Tokens = real cash.
        </p>
      </div>

      <div style="margin:0 0 24px;">
        ${[
          ["📄", "Upload any PDF — lecture notes, past papers, textbooks, guides"],
          ["👀", "People view your material and you rack up tokens automatically"],
          ["💸", "Cash out whenever you're ready via PayPal, mobile money, or bank transfer"],
        ]
          .map(
            ([icon, label]) => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
            <span style="font-size:18px;line-height:1.4;flex-shrink:0;">${icon}</span>
            <span style="font-size:14px;line-height:1.6;color:#202020;">${label}</span>
          </div>`,
          )
          .join("")}
      </div>

      <a
        href="${serverUrl}/"
        style="display:block;text-align:center;padding:14px 24px;border-radius:14px;background:#1d1d1d;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.01em;"
      >
        Upload something now →
      </a>

      <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:#9f9f9f;text-align:center;">
        You're getting this because upload reminders are enabled.<br/>
        <a href="${serverUrl}/settings/notifications/email" style="color:#9f9f9f;text-decoration:underline;">Turn off upload reminders</a>
      </p>
    `,
  });

  await sendEmail({
    to: email,
    subject: `${firstName}, someone out there needs your notes 📚`,
    text,
    html,
  });
};
