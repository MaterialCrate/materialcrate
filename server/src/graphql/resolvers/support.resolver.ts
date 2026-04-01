import { prisma } from "../../config/prisma";
import { sendEmail } from "../../email/shared";

type GraphQLContext = {
  user?: {
    sub?: string;
  };
};

const VALID_TOPICS = new Set([
  "general",
  "account",
  "billing",
  "feature",
  "other",
]);

const TOPIC_LABELS: Record<string, string> = {
  general: "General question",
  account: "Account & settings",
  billing: "Billing & payments",
  feature: "Feature request",
  other: "Other",
};

const MAX_SUBJECT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 2000;

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@materialcrate.com";

export const SupportResolver = {
  Mutation: {
    sendSupportMessage: async (
      _: unknown,
      args: {
        topic: string;
        subject: string;
        message: string;
      },
      ctx: GraphQLContext,
    ) => {
      const userId = ctx.user?.sub;
      if (!userId) throw new Error("Authentication required.");

      const topic = args.topic.trim().toLowerCase();
      if (!VALID_TOPICS.has(topic)) {
        throw new Error("Invalid topic.");
      }

      const subject = args.subject.trim();
      if (subject.length < 5 || subject.length > MAX_SUBJECT_LENGTH) {
        throw new Error(
          `Subject must be between 5 and ${MAX_SUBJECT_LENGTH} characters.`,
        );
      }

      const message = args.message.trim();
      if (message.length < 20 || message.length > MAX_MESSAGE_LENGTH) {
        throw new Error(
          `Message must be between 20 and ${MAX_MESSAGE_LENGTH} characters.`,
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, displayName: true },
      });

      if (!user) throw new Error("User not found.");

      const topicLabel = TOPIC_LABELS[topic] ?? topic;

      const emailSubject = `[Support] ${topicLabel}: ${subject}`;

      const text = [
        `New support message from ${user.displayName ?? "Unknown"} (${user.email})`,
        "",
        `Topic: ${topicLabel}`,
        `Subject: ${subject}`,
        `User ID: ${user.id}`,
        "",
        "Message:",
        message,
      ].join("\n");

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1D1D1D; font-size: 18px; margin-bottom: 16px;">New Support Message</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 12px; background: #F8F8F8; border: 1px solid #E5E5E5; font-size: 13px; color: #888;">From</td>
              <td style="padding: 8px 12px; border: 1px solid #E5E5E5; font-size: 13px;">${user.displayName ?? "Unknown"} &lt;${user.email}&gt;</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #F8F8F8; border: 1px solid #E5E5E5; font-size: 13px; color: #888;">Topic</td>
              <td style="padding: 8px 12px; border: 1px solid #E5E5E5; font-size: 13px;">${topicLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #F8F8F8; border: 1px solid #E5E5E5; font-size: 13px; color: #888;">Subject</td>
              <td style="padding: 8px 12px; border: 1px solid #E5E5E5; font-size: 13px;">${subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #F8F8F8; border: 1px solid #E5E5E5; font-size: 13px; color: #888;">User ID</td>
              <td style="padding: 8px 12px; border: 1px solid #E5E5E5; font-size: 13px; font-family: monospace;">${user.id}</td>
            </tr>
          </table>
          <div style="background: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 8px; padding: 16px;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #333; white-space: pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>
        </div>
      `;

      await sendEmail({
        to: SUPPORT_EMAIL,
        subject: emailSubject,
        text,
        html,
      });

      return { success: true };
    },
  },
};
