ALTER TABLE "Notification"
ADD COLUMN IF NOT EXISTS "userId" TEXT,
ADD COLUMN IF NOT EXISTS "title" TEXT,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "icon" TEXT,
ADD COLUMN IF NOT EXISTS "unread" BOOLEAN,
ADD COLUMN IF NOT EXISTS "time" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Notification' AND column_name = 'recipientId'
  ) THEN
    EXECUTE $update$
      UPDATE "Notification" AS n
      SET
        "userId" = COALESCE(n."userId", n."recipientId"),
        "time" = COALESCE(n."time", n."createdAt", CURRENT_TIMESTAMP),
        "unread" = COALESCE(n."unread", n."readAt" IS NULL),
        "icon" = COALESCE(
          n."icon",
          CASE n."type"::text
            WHEN 'FOLLOW' THEN 'Profile2User'
            WHEN 'FOLLOW_BACK' THEN 'Profile2User'
            WHEN 'POST_LIKE' THEN 'Heart'
            WHEN 'COMMENT' THEN 'MessageText1'
            WHEN 'COMMENT_REPLY' THEN 'MessageText1'
            WHEN 'COMMENT_LIKE' THEN 'Like1'
            ELSE 'Notification'
          END
        ),
        "title" = COALESCE(
          n."title",
          CASE n."type"::text
            WHEN 'FOLLOW' THEN 'New follower'
            WHEN 'FOLLOW_BACK' THEN 'New follower'
            WHEN 'POST_LIKE' THEN 'New like'
            WHEN 'COMMENT' THEN 'New comment'
            WHEN 'COMMENT_REPLY' THEN 'New reply'
            WHEN 'COMMENT_LIKE' THEN 'Comment liked'
            ELSE 'Notification'
          END
        ),
        "description" = COALESCE(
          n."description",
          CASE n."type"::text
            WHEN 'FOLLOW' THEN COALESCE((SELECT u."displayName" FROM "User" u WHERE u.id = n."actorId"), 'Someone') || ' started following you.'
            WHEN 'FOLLOW_BACK' THEN COALESCE((SELECT u."displayName" FROM "User" u WHERE u.id = n."actorId"), 'Someone') || ' started following you.'
            WHEN 'POST_LIKE' THEN COALESCE((SELECT u."displayName" FROM "User" u WHERE u.id = n."actorId"), 'Someone') || ' liked your post.'
            WHEN 'COMMENT' THEN COALESCE((SELECT u."displayName" FROM "User" u WHERE u.id = n."actorId"), 'Someone') || ' commented on your post.'
            WHEN 'COMMENT_REPLY' THEN COALESCE((SELECT u."displayName" FROM "User" u WHERE u.id = n."actorId"), 'Someone') || ' replied to a thread on your post.'
            WHEN 'COMMENT_LIKE' THEN COALESCE((SELECT u."displayName" FROM "User" u WHERE u.id = n."actorId"), 'Someone') || ' liked your comment.'
            ELSE 'You have a new notification.'
          END
        )
    $update$;
  END IF;
END $$;

UPDATE "Notification"
SET
  "time" = COALESCE("time", CURRENT_TIMESTAMP),
  "unread" = COALESCE("unread", TRUE),
  "icon" = COALESCE(NULLIF(TRIM("icon"), ''), 'Notification'),
  "title" = COALESCE(NULLIF(TRIM("title"), ''), 'Notification'),
  "description" = COALESCE(NULLIF(TRIM("description"), ''), 'You have a new notification.');

ALTER TABLE "Notification"
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "icon" SET NOT NULL,
ALTER COLUMN "unread" SET NOT NULL,
ALTER COLUMN "unread" SET DEFAULT true,
ALTER COLUMN "time" SET NOT NULL,
ALTER COLUMN "time" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Notification_userId_time_idx" ON "Notification"("userId", "time");
CREATE INDEX IF NOT EXISTS "Notification_userId_unread_idx" ON "Notification"("userId", "unread");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Notification_userId_fkey'
  ) THEN
    ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "Notification_actorId_idx";
DROP INDEX IF EXISTS "Notification_recipientId_createdAt_idx";
DROP INDEX IF EXISTS "Notification_recipientId_readAt_idx";

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_actorId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_recipientId_fkey";

ALTER TABLE "Notification" DROP COLUMN IF EXISTS "actorId";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "recipientId";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "type";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "readAt";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "createdAt";

DROP TYPE IF EXISTS "NotificationType";
