UPDATE "User"
SET "subscriptionPlan" = LOWER(TRIM(COALESCE("subscriptionPlan", 'free')))
WHERE "subscriptionPlan" IS NULL
   OR "subscriptionPlan" <> LOWER(TRIM(COALESCE("subscriptionPlan", 'free')));

UPDATE "User"
SET "subscriptionPlan" = 'free'
WHERE "subscriptionPlan" NOT IN ('free', 'pro', 'premium');

ALTER TABLE "User"
DROP CONSTRAINT IF EXISTS "User_subscriptionPlan_check";

ALTER TABLE "User"
DROP CONSTRAINT IF EXISTS user_subscription_plan_allowed_values;

ALTER TABLE "User"
ADD CONSTRAINT user_subscription_plan_allowed_values
CHECK ("subscriptionPlan" IN ('free', 'pro', 'premium'));
