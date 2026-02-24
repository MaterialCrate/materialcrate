ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS "subscriptionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_subscriptionPlan_check'
  ) THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_subscriptionPlan_check"
    CHECK ("subscriptionPlan" IN ('free', 'pro'));
  END IF;
END $$;
