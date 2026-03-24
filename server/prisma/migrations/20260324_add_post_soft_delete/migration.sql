ALTER TABLE "Post"
ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Post_deleted_deletedAt_idx" ON "Post"("deleted", "deletedAt");
