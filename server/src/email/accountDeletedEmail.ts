import { renderEmailLayout } from "./layout.js";
import { isEmailDeliveryConfigured, sendEmail } from "./shared.js";

const formatDeadline = (value: Date) =>
  value.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

const getAccountDeletedEmailContent = (restoreDeadline: Date) => {
  const formattedDeadline = formatDeadline(restoreDeadline);
  const subject = "Your Material Crate account was deleted";
  const eyebrow = "Account update";
  const heading = "Your account is scheduled for deletion";
  const body =
    "Your Material Crate account has been softly deleted. Your public profile is hidden, and your posts now show Deleted / @deleted while your account stays recoverable for 30 days.";
  const restoreSteps = [
    "Log back in with your usual email and password within 30 days.",
    "Confirm the restore prompt shown after sign-in.",
    `Restore access before ${formattedDeadline}.`,
  ];
  const footer =
    "After the 30-day window ends, the deleted account can no longer be restored automatically.";

  const text = [
    heading,
    "",
    body,
    "",
    "How restoration works:",
    ...restoreSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
    footer,
  ].join("\n");

  const html = renderEmailLayout({
    eyebrow,
    heading,
    body,
    content: `
      <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a9a9a;">
        Restore window
      </p>
      <div style="margin:18px 0 20px;padding:20px 16px;border-radius:22px;background:#fafafa;border:1px solid rgba(0,0,0,0.08);text-align:left;">
        <p style="margin:0;font-size:16px;line-height:1.7;font-weight:600;color:#202020;">
          You can restore this account until ${formattedDeadline}.
        </p>
        <ol style="margin:14px 0 0;padding-left:18px;font-size:14px;line-height:1.8;color:#5f5f5f;">
          ${restoreSteps.map((step) => `<li>${step}</li>`).join("")}
        </ol>
      </div>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#5f5f5f;">
        ${footer}
      </p>
    `,
  });

  return { subject, text, html };
};

export const sendAccountDeletedEmail = async (
  email: string,
  restoreDeadline: Date,
) => {
  if (!isEmailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[email] Delivery is not configured. Account deletion email skipped for ${email}`,
      );
      return;
    }
  }

  const content = getAccountDeletedEmailContent(restoreDeadline);
  await sendEmail({ to: email, ...content });
};
