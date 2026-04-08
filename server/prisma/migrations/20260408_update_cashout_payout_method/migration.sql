-- AlterTable: replace paypalEmail with flexible payout method fields
-- Safe: TokenCashoutRequest was just created and has no prod data yet
ALTER TABLE "TokenCashoutRequest"
  DROP COLUMN IF EXISTS "paypalEmail",
  ADD COLUMN "payoutMethod" TEXT NOT NULL DEFAULT 'paypal',
  ADD COLUMN "payoutDetails" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- Remove the temporary defaults (enforced at app level going forward)
ALTER TABLE "TokenCashoutRequest"
  ALTER COLUMN "payoutMethod" DROP DEFAULT,
  ALTER COLUMN "payoutDetails" DROP DEFAULT;
