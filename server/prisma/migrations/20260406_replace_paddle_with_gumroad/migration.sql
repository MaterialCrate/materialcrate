-- Drop Paddle billing fields
ALTER TABLE "User" DROP COLUMN IF EXISTS "paddleCustomerId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "paddleSubscriptionId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "paddleSubscriptionStatus";
ALTER TABLE "User" DROP COLUMN IF EXISTS "paddlePriceId";

-- Add Gumroad billing fields
ALTER TABLE "User" ADD COLUMN "gumroadSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "gumroadSaleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_gumroadSubscriptionId_key" ON "User"("gumroadSubscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_gumroadSaleId_key" ON "User"("gumroadSaleId");
