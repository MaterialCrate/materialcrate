-- ─── Add postId + commentId to Notification ──────────────────────────────────
-- The resolver already reads notification.postId; this makes the column real.
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "postId"    TEXT,
  ADD COLUMN IF NOT EXISTS "commentId" TEXT;

CREATE INDEX IF NOT EXISTS "Notification_postId_idx" ON "Notification"("postId") WHERE "postId" IS NOT NULL;

-- ─── Plagiarism cases ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PlagiarismCase" (
  "id"                   TEXT        NOT NULL,
  "originalPostId"       TEXT        NOT NULL,
  "suspectedPostId"      TEXT        NOT NULL,
  "similarityScore"      DOUBLE PRECISION NOT NULL,
  "verdict"              TEXT        NOT NULL,  -- DUPLICATE | SUSPICIOUS | POSSIBLE
  "status"               TEXT        NOT NULL DEFAULT 'PENDING_REVIEW',
  "matchedChunkCount"    INTEGER     NOT NULL DEFAULT 0,
  "totalChunkCount"      INTEGER     NOT NULL DEFAULT 0,
  "revenueRedirectEnabled" BOOLEAN   NOT NULL DEFAULT FALSE,
  "matchSummaryJson"     JSONB       NOT NULL DEFAULT '{}',
  "moderatorId"          TEXT,
  "moderatorNote"        TEXT,
  "resolvedAt"           TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlagiarismCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlagiarismCase_originalPost_fkey"  FOREIGN KEY ("originalPostId")  REFERENCES "Post"("id") ON DELETE CASCADE,
  CONSTRAINT "PlagiarismCase_suspectedPost_fkey" FOREIGN KEY ("suspectedPostId") REFERENCES "Post"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlagiarismCase_originalPostId_idx"  ON "PlagiarismCase"("originalPostId");
CREATE INDEX IF NOT EXISTS "PlagiarismCase_suspectedPostId_idx" ON "PlagiarismCase"("suspectedPostId");
CREATE INDEX IF NOT EXISTS "PlagiarismCase_status_idx"          ON "PlagiarismCase"("status");
-- Prevent duplicate cases for the same post pair
CREATE UNIQUE INDEX IF NOT EXISTS "PlagiarismCase_pair_unique"
  ON "PlagiarismCase"("originalPostId", "suspectedPostId");

-- ─── Revenue redirects ────────────────────────────────────────────────────────
-- When a suspected post earns revenue, it flows to the original author instead.
CREATE TABLE IF NOT EXISTS "RevenueRedirect" (
  "id"                  TEXT        NOT NULL,
  "caseId"              TEXT        NOT NULL,
  "sourcePostId"        TEXT        NOT NULL,  -- the copied post purchases are made on
  "beneficiaryPostId"   TEXT        NOT NULL,  -- the original post
  "beneficiaryUserId"   TEXT        NOT NULL,  -- original author receives the tokens
  "redirectPercentage"  DOUBLE PRECISION NOT NULL DEFAULT 100,
  "reason"              TEXT        NOT NULL,
  "active"              BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RevenueRedirect_pkey"   PRIMARY KEY ("id"),
  CONSTRAINT "RevenueRedirect_case_unique" UNIQUE ("caseId"),
  CONSTRAINT "RevenueRedirect_case_fkey" FOREIGN KEY ("caseId")
    REFERENCES "PlagiarismCase"("id") ON DELETE CASCADE,
  CONSTRAINT "RevenueRedirect_beneficiary_fkey" FOREIGN KEY ("beneficiaryUserId")
    REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "RevenueRedirect_sourcePostId_active_idx"
  ON "RevenueRedirect"("sourcePostId", "active");

-- ─── Plagiarism appeals ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PlagiarismAppeal" (
  "id"        TEXT        NOT NULL,
  "caseId"    TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "reason"    TEXT        NOT NULL,
  "status"    TEXT        NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED
  "response"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlagiarismAppeal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlagiarismAppeal_case_fkey" FOREIGN KEY ("caseId")
    REFERENCES "PlagiarismCase"("id") ON DELETE CASCADE,
  CONSTRAINT "PlagiarismAppeal_user_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlagiarismAppeal_caseId_idx" ON "PlagiarismAppeal"("caseId");
CREATE INDEX IF NOT EXISTS "PlagiarismAppeal_userId_idx" ON "PlagiarismAppeal"("userId");
