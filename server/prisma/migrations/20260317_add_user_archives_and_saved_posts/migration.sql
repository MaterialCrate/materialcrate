CREATE TABLE IF NOT EXISTS "Archive" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'My Archive',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Archive_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Archive_userId_key"
ON "Archive"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Archive_userId_fkey'
  ) THEN
    ALTER TABLE "Archive"
    ADD CONSTRAINT "Archive_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ArchiveFolder" (
  "id" TEXT NOT NULL,
  "archiveId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArchiveFolder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ArchiveFolder_archiveId_name_key"
ON "ArchiveFolder"("archiveId", "name");

CREATE INDEX IF NOT EXISTS "ArchiveFolder_archiveId_idx"
ON "ArchiveFolder"("archiveId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ArchiveFolder_archiveId_fkey'
  ) THEN
    ALTER TABLE "ArchiveFolder"
    ADD CONSTRAINT "ArchiveFolder_archiveId_fkey"
    FOREIGN KEY ("archiveId")
    REFERENCES "Archive"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ArchiveSavedPost" (
  "id" TEXT NOT NULL,
  "archiveId" TEXT NOT NULL,
  "folderId" TEXT,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchiveSavedPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ArchiveSavedPost_archiveId_postId_key"
ON "ArchiveSavedPost"("archiveId", "postId");

CREATE INDEX IF NOT EXISTS "ArchiveSavedPost_archiveId_folderId_idx"
ON "ArchiveSavedPost"("archiveId", "folderId");

CREATE INDEX IF NOT EXISTS "ArchiveSavedPost_postId_idx"
ON "ArchiveSavedPost"("postId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ArchiveSavedPost_archiveId_fkey'
  ) THEN
    ALTER TABLE "ArchiveSavedPost"
    ADD CONSTRAINT "ArchiveSavedPost_archiveId_fkey"
    FOREIGN KEY ("archiveId")
    REFERENCES "Archive"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ArchiveSavedPost_folderId_fkey'
  ) THEN
    ALTER TABLE "ArchiveSavedPost"
    ADD CONSTRAINT "ArchiveSavedPost_folderId_fkey"
    FOREIGN KEY ("folderId")
    REFERENCES "ArchiveFolder"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ArchiveSavedPost_postId_fkey'
  ) THEN
    ALTER TABLE "ArchiveSavedPost"
    ADD CONSTRAINT "ArchiveSavedPost_postId_fkey"
    FOREIGN KEY ("postId")
    REFERENCES "Post"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "Archive" ("id", "userId", "name", "updatedAt")
SELECT
  CONCAT('ar_', md5(random()::text || clock_timestamp()::text || u."id")),
  u."id",
  'My Archive',
  CURRENT_TIMESTAMP
FROM "User" u
LEFT JOIN "Archive" a ON a."userId" = u."id"
WHERE a."id" IS NULL;
