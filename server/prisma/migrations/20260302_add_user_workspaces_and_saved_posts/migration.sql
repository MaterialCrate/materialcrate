CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'My Workspace',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_userId_key"
ON "Workspace"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Workspace_userId_fkey'
  ) THEN
    ALTER TABLE "Workspace"
    ADD CONSTRAINT "Workspace_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "WorkspaceFolder" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceFolder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceFolder_workspaceId_name_key"
ON "WorkspaceFolder"("workspaceId", "name");

CREATE INDEX IF NOT EXISTS "WorkspaceFolder_workspaceId_idx"
ON "WorkspaceFolder"("workspaceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceFolder_workspaceId_fkey'
  ) THEN
    ALTER TABLE "WorkspaceFolder"
    ADD CONSTRAINT "WorkspaceFolder_workspaceId_fkey"
    FOREIGN KEY ("workspaceId")
    REFERENCES "Workspace"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "WorkspaceSavedPost" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "folderId" TEXT,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceSavedPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceSavedPost_workspaceId_postId_key"
ON "WorkspaceSavedPost"("workspaceId", "postId");

CREATE INDEX IF NOT EXISTS "WorkspaceSavedPost_workspaceId_folderId_idx"
ON "WorkspaceSavedPost"("workspaceId", "folderId");

CREATE INDEX IF NOT EXISTS "WorkspaceSavedPost_postId_idx"
ON "WorkspaceSavedPost"("postId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceSavedPost_workspaceId_fkey'
  ) THEN
    ALTER TABLE "WorkspaceSavedPost"
    ADD CONSTRAINT "WorkspaceSavedPost_workspaceId_fkey"
    FOREIGN KEY ("workspaceId")
    REFERENCES "Workspace"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceSavedPost_folderId_fkey'
  ) THEN
    ALTER TABLE "WorkspaceSavedPost"
    ADD CONSTRAINT "WorkspaceSavedPost_folderId_fkey"
    FOREIGN KEY ("folderId")
    REFERENCES "WorkspaceFolder"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceSavedPost_postId_fkey'
  ) THEN
    ALTER TABLE "WorkspaceSavedPost"
    ADD CONSTRAINT "WorkspaceSavedPost_postId_fkey"
    FOREIGN KEY ("postId")
    REFERENCES "Post"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "Workspace" ("id", "userId", "name", "updatedAt")
SELECT
  CONCAT('ws_', md5(random()::text || clock_timestamp()::text || u."id")),
  u."id",
  'My Workspace',
  CURRENT_TIMESTAMP
FROM "User" u
LEFT JOIN "Workspace" w ON w."userId" = u."id"
WHERE w."id" IS NULL;
