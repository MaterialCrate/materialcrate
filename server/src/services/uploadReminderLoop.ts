import { prisma } from "../config/prisma.js";
import { sendUploadReminderEmail } from "../email/uploadReminderEmail.js";

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000; // check daily (DB gates who actually gets sent)
const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // only remind once per 7 days per user
const UPLOAD_INACTIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // no upload in last 7 days
const SEND_DELAY_MS = 300; // 300ms between emails (~3/sec, well under the 5/sec limit)

export const sendUploadReminders = async () => {
  const now = new Date();
  const inactiveSince = new Date(now.getTime() - UPLOAD_INACTIVE_THRESHOLD_MS);
  const reminderCooldownSince = new Date(now.getTime() - REMINDER_COOLDOWN_MS);

  // Only send to users who:
  // - are verified + active + opted in
  // - haven't uploaded in the last 7 days
  // - haven't received a reminder in the last 7 days (survives server restarts)
  const users = await prisma.user.findMany({
    where: {
      emailVerified: true,
      deleted: false,
      disabled: false,
      emailNotificationsUploadReminder: true,
      OR: [
        { lastUploadReminderSentAt: null },
        { lastUploadReminderSentAt: { lte: reminderCooldownSince } },
      ],
      posts: {
        none: {
          createdAt: { gte: inactiveSince },
          deleted: false,
        },
      },
    },
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await sendUploadReminderEmail(user.email, user.displayName);
      await prisma.user.update({
        where: { id: user.id },
        data: { lastUploadReminderSentAt: new Date() },
      });
      sent++;
    } catch (error) {
      failed++;
      console.error(
        `[uploadReminder] Failed to send reminder to ${user.email}:`,
        error,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
  }

  return { sent, failed, total: users.length };
};

export const startUploadReminderLoop = () => {
  let isRunning = false;

  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const result = await sendUploadReminders();
      if (result.total > 0) {
        console.log(
          `[uploadReminder] Sent ${result.sent}/${result.total} upload reminders (${result.failed} failed)`,
        );
      }
    } catch (error) {
      console.error("[uploadReminder] Loop error:", error);
    } finally {
      isRunning = false;
    }
  };

  void run();

  const timer = setInterval(() => {
    void run();
  }, REMINDER_INTERVAL_MS);

  timer.unref?.();
};
