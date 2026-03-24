CREATE TABLE "PostVersion" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "courseCode" TEXT NOT NULL,
  "description" TEXT,
  "year" INTEGER,
  "fileUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "editorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PostVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostVersion_postId_versionNumber_key"
ON "PostVersion"("postId", "versionNumber");

CREATE INDEX "PostVersion_postId_createdAt_idx"
ON "PostVersion"("postId", "createdAt");

CREATE INDEX "PostVersion_editorId_idx"
ON "PostVersion"("editorId");

ALTER TABLE "PostVersion"
ADD CONSTRAINT "PostVersion_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostVersion"
ADD CONSTRAINT "PostVersion_editorId_fkey"
FOREIGN KEY ("editorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
