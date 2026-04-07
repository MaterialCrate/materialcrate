import { prisma } from "../config/prisma.js";

const UNVERIFIED_DELETE_AFTER_DAYS = 7;
const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

export const purgeUnverifiedUsers = async () => {
  const cutoff = new Date(
    Date.now() - UNVERIFIED_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000,
  );

  const result = await prisma.user.deleteMany({
    where: {
      emailVerified: false,
      createdAt: { lte: cutoff },
      deleted: false,
      disabled: false,
    },
  });

  return { purgedCount: result.count };
};

export const startUnverifiedUserPurgeLoop = () => {
  let isRunning = false;

  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const result = await purgeUnverifiedUsers();
      if (result.purgedCount > 0) {
        console.log(
          `Purged ${result.purgedCount} unverified user accounts older than ${UNVERIFIED_DELETE_AFTER_DAYS} days`,
        );
      }
    } catch (error) {
      console.error("Failed to purge unverified users:", error);
    } finally {
      isRunning = false;
    }
  };

  void run();

  const timer = setInterval(() => {
    void run();
  }, PURGE_INTERVAL_MS);

  timer.unref?.();
};
