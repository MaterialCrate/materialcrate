UPDATE "User"
SET "subscriptionPlan" = LOWER(TRIM(COALESCE("subscriptionPlan", 'free')))
WHERE "subscriptionPlan" IS NULL
   OR "subscriptionPlan" <> LOWER(TRIM(COALESCE("subscriptionPlan", 'free')));

UPDATE "User"
SET "subscriptionPlan" = 'free'
WHERE "subscriptionPlan" NOT IN ('free', 'pro', 'premium');

ALTER TABLE "User"
ALTER COLUMN "subscriptionPlan" SET DEFAULT 'free';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_subscription_plan_allowed_values'
  ) THEN
    ALTER TABLE "User"
    ADD CONSTRAINT user_subscription_plan_allowed_values
    CHECK ("subscriptionPlan" IN ('free', 'pro', 'premium'));
  END IF;
END $$;
