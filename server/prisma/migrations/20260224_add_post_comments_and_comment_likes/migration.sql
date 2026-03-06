CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "parentId" TEXT,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Comment"
ADD COLUMN IF NOT EXISTS "parentId" TEXT;

CREATE INDEX IF NOT EXISTS "Comment_postId_createdAt_idx"
ON "Comment"("postId", "createdAt");

CREATE INDEX IF NOT EXISTS "Comment_parentId_createdAt_idx"
ON "Comment"("parentId", "createdAt");

CREATE INDEX IF NOT EXISTS "Comment_authorId_idx" ON "Comment"("authorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Comment_postId_fkey'
  ) THEN
    ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_postId_fkey"
    FOREIGN KEY ("postId")
    REFERENCES "Post"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Comment_authorId_fkey'
  ) THEN
    ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_authorId_fkey"
    FOREIGN KEY ("authorId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;

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

CREATE TABLE IF NOT EXISTS "CommentLike" (
  "userId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("userId", "commentId")
);

CREATE INDEX IF NOT EXISTS "CommentLike_commentId_idx"
ON "CommentLike"("commentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CommentLike_userId_fkey'
  ) THEN
    ALTER TABLE "CommentLike"
    ADD CONSTRAINT "CommentLike_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CommentLike_commentId_fkey'
  ) THEN
    ALTER TABLE "CommentLike"
    ADD CONSTRAINT "CommentLike_commentId_fkey"
    FOREIGN KEY ("commentId")
    REFERENCES "Comment"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
