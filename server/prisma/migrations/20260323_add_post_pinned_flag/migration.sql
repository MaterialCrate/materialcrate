ALTER TABLE "Post"
ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Post_authorId_single_pinned_idx"
ON "Post" ("authorId")
WHERE "pinned" = true AND "authorId" IS NOT NULL;
