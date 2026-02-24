ALTER TABLE "Comment"
ADD COLUMN IF NOT EXISTS "parentId" TEXT;

CREATE INDEX IF NOT EXISTS "Comment_parentId_createdAt_idx"
ON "Comment"("parentId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Comment_parentId_fkey'
  ) THEN
    ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_parentId_fkey"
    FOREIGN KEY ("parentId")
    REFERENCES "Comment"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
