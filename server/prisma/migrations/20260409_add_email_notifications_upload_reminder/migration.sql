ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotificationsUploadReminder" BOOLEAN NOT NULL DEFAULT true;
