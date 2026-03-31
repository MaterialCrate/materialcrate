ALTER TABLE "User"
ADD COLUMN "emailNotificationsAccountActivity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "emailNotificationsWeeklySummary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "emailNotificationsProductUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "emailNotificationsMarketing" BOOLEAN NOT NULL DEFAULT true;
