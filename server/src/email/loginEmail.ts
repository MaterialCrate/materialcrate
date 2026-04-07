import { renderEmailLayout } from "./layout.js";
import { isEmailDeliveryConfigured, sendEmail } from "./shared.js";

export const sendLoginEmail = async (
  email: string,
  displayName: string,
  ip: string | null,
) => {
  if (!isEmailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[email] Delivery is not configured. Login email skipped for ${email}`,
      );
      return;
    }
  }

  const firstName = displayName.split(" ")[0] ?? displayName;
  const now = new Date();
  const time = now.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const subject = "New sign-in to your Material Crate account";
  const eyebrow = "Security alert";
  const heading = "New sign-in detected";
  const body = `Hi ${firstName}, we noticed a new sign-in to your Material Crate account.`;

  const text = [
    heading,
    "",
    body,
    "",
    `Time: ${time}`,
    ip ? `IP address: ${ip}` : null,
    "",
    "If this was you, no action is needed. If you don't recognise this sign-in, reset your password immediately.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = renderEmailLayout({
    eyebrow,
    heading,
    body,
    content: `
      <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a9a9a;">
        Sign-in details
      </p>
      <div style="margin:18px 0 20px;padding:20px 16px;border-radius:22px;background:#fafafa;border:1px solid rgba(0,0,0,0.08);">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#9a9a9a;width:90px;">Time</td>
            <td style="padding:6px 0;font-size:13px;color:#202020;font-weight:500;">${time}</td>
          </tr>
          ${
            ip
              ? `<tr>
            <td style="padding:6px 0;font-size:13px;color:#9a9a9a;width:90px;border-top:1px solid rgba(0,0,0,0.06);">IP address</td>
            <td style="padding:6px 0;font-size:13px;color:#202020;font-weight:500;border-top:1px solid rgba(0,0,0,0.06);">${ip}</td>
          </tr>`
              : ""
          }
        </table>
      </div>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#5f5f5f;">
        If this was you, no action is needed.
      </p>
      <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#5f5f5f;">
        If you don't recognise this sign-in, <strong style="color:#202020;">reset your password immediately</strong> and review your account activity.
      </p>
    `,
  });

  await sendEmail({ to: email, subject, text, html });
};
