ALTER TABLE "Notification"
ADD COLUMN IF NOT EXISTS "actorId" TEXT;

UPDATE "Notification" AS n
SET "actorId" = u."id"
FROM "User" AS u
WHERE n."actorId" IS NULL
  AND n."type" = 'FOLLOW'
  AND (
    LOWER(u."displayName") = LOWER(
      REGEXP_REPLACE(n."description", ' started following you\.$', '')
    )
    OR LOWER(u."username") = LOWER(
      REGEXP_REPLACE(n."description", ' started following you\.$', '')
    )
  );

CREATE INDEX IF NOT EXISTS "Notification_userId_type_actorId_idx" ON "Notification"("userId", "type", "actorId");
