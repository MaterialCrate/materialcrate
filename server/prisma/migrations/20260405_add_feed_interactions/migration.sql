-- CreateTable
CREATE TABLE "FeedInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "interactionType" TEXT NOT NULL,
    "signalKind" TEXT NOT NULL DEFAULT 'positive',
    "category" TEXT,
    "searchTerm" TEXT,
    "durationMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedInteraction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeedInteraction"
ADD CONSTRAINT "FeedInteraction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedInteraction"
ADD CONSTRAINT "FeedInteraction_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "FeedInteraction_userId_createdAt_idx" ON "FeedInteraction"("userId", "createdAt");
CREATE INDEX "FeedInteraction_userId_interactionType_createdAt_idx" ON "FeedInteraction"("userId", "interactionType", "createdAt");
CREATE INDEX "FeedInteraction_userId_signalKind_createdAt_idx" ON "FeedInteraction"("userId", "signalKind", "createdAt");
CREATE INDEX "FeedInteraction_postId_createdAt_idx" ON "FeedInteraction"("postId", "createdAt");
CREATE INDEX "FeedInteraction_category_createdAt_idx" ON "FeedInteraction"("category", "createdAt");
CREATE INDEX "FeedInteraction_searchTerm_createdAt_idx" ON "FeedInteraction"("searchTerm", "createdAt");
