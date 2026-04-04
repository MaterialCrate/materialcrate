CREATE TABLE IF NOT EXISTS "HubChat" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "savedPostId" TEXT,
  "documentTitle" TEXT NOT NULL,
  "messages" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HubChat_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "HubChat"
    ADD CONSTRAINT "HubChat_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "HubChat"
    ADD CONSTRAINT "HubChat_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "HubChat_userId_postId_key"
  ON "HubChat"("userId", "postId");

CREATE INDEX IF NOT EXISTS "HubChat_userId_updatedAt_idx"
  ON "HubChat"("userId", "updatedAt");

CREATE INDEX IF NOT EXISTS "HubChat_postId_idx"
  ON "HubChat"("postId");
