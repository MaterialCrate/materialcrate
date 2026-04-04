ALTER TABLE "User"
ADD COLUMN "pendingSubscriptionPlan" TEXT,
ADD COLUMN "pendingSubscriptionAction" TEXT,
ADD COLUMN "pendingSubscriptionEffectiveAt" TIMESTAMP(3);
