ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "paddleCustomerId" TEXT,
ADD COLUMN IF NOT EXISTS "paddleSubscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS "paddleSubscriptionStatus" TEXT,
ADD COLUMN IF NOT EXISTS "paddlePriceId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_paddleCustomerId_key"
  ON "User" ("paddleCustomerId");

CREATE UNIQUE INDEX IF NOT EXISTS "User_paddleSubscriptionId_key"
  ON "User" ("paddleSubscriptionId");
