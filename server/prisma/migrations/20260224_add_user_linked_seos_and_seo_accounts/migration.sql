ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "linkedSEOs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  CREATE TYPE "SeoProvider" AS ENUM ('GOOGLE', 'FACEBOOK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SeoAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "SeoProvider" NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeoAccount_provider_providerUserId_key"
ON "SeoAccount"("provider", "providerUserId");

CREATE UNIQUE INDEX IF NOT EXISTS "SeoAccount_userId_provider_key"
ON "SeoAccount"("userId", "provider");

CREATE INDEX IF NOT EXISTS "SeoAccount_userId_idx" ON "SeoAccount"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SeoAccount_userId_fkey'
  ) THEN
    ALTER TABLE "SeoAccount"
    ADD CONSTRAINT "SeoAccount_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
