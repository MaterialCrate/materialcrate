ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "profilePicture" TEXT,
ADD COLUMN IF NOT EXISTS "profileBackground" TEXT NOT NULL DEFAULT 'bg-linear-to-br from-[#E1761F] via-[#ffecdc] to-stone-200',
ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT 'light',
ADD COLUMN IF NOT EXISTS "visibilityPublicProfile" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "visibilityPublicPosts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "visibilityPublicComments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "visibilityOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "emailNotificationsAccountActivity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "emailNotificationsWeeklySummary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "emailNotificationsProductUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "emailNotificationsMarketing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "pushNotificationsLikes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "pushNotificationsComments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "pushNotificationsFollows" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "pushNotificationsMentions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "pendingEmail" TEXT,
ADD COLUMN IF NOT EXISTS "linkedSEOs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "uninterestedPostIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "blockedUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS "subscriptionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "disabledUntil" TIMESTAMP(3);

UPDATE "User"
SET
  "profileBackground" = COALESCE(NULLIF(TRIM("profileBackground"), ''), 'bg-linear-to-br from-[#E1761F] via-[#ffecdc] to-stone-200'),
  "theme" = COALESCE(NULLIF(TRIM("theme"), ''), 'light'),
  "subscriptionPlan" = COALESCE(NULLIF(TRIM("subscriptionPlan"), ''), 'free');

ALTER TABLE "Post"
ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT,
ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "commentsDisabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "unread" BOOLEAN NOT NULL DEFAULT true,
  "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification"
ADD COLUMN IF NOT EXISTS "actorId" TEXT,
ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN IF NOT EXISTS "profilePicture" TEXT,
ADD COLUMN IF NOT EXISTS "userId" TEXT,
ADD COLUMN IF NOT EXISTS "title" TEXT,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "icon" TEXT,
ADD COLUMN IF NOT EXISTS "unread" BOOLEAN,
ADD COLUMN IF NOT EXISTS "time" TIMESTAMP(3);

UPDATE "Notification"
SET
  "type" = COALESCE(NULLIF(TRIM("type"), ''), 'SYSTEM'),
  "title" = COALESCE(NULLIF(TRIM("title"), ''), 'Notification'),
  "description" = COALESCE(NULLIF(TRIM("description"), ''), 'You have a new notification.'),
  "icon" = COALESCE(NULLIF(TRIM("icon"), ''), 'Notification'),
  "unread" = COALESCE("unread", true),
  "time" = COALESCE("time", CURRENT_TIMESTAMP)
WHERE TRUE;

ALTER TABLE "Notification"
ALTER COLUMN "type" SET DEFAULT 'SYSTEM',
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "icon" SET NOT NULL,
ALTER COLUMN "unread" SET NOT NULL,
ALTER COLUMN "unread" SET DEFAULT true,
ALTER COLUMN "time" SET NOT NULL,
ALTER COLUMN "time" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Notification_userId_time_idx" ON "Notification"("userId", "time");
CREATE INDEX IF NOT EXISTS "Notification_userId_unread_idx" ON "Notification"("userId", "unread");
CREATE INDEX IF NOT EXISTS "Notification_userId_type_actorId_idx" ON "Notification"("userId", "type", "actorId");
