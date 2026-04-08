-- AlterTable: add token balance fields to User
ALTER TABLE "User" ADD COLUMN "tokenBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "tokensEarned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "tokensRedeemed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: TokenTransaction
CREATE TABLE "TokenTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "postId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TokenCashoutRequest
CREATE TABLE "TokenCashoutRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokensAmount" INTEGER NOT NULL,
    "cashAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paypalEmail" TEXT NOT NULL,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenCashoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenTransaction_userId_createdAt_idx" ON "TokenTransaction"("userId", "createdAt");
CREATE INDEX "TokenTransaction_userId_type_idx" ON "TokenTransaction"("userId", "type");
CREATE INDEX "TokenTransaction_postId_idx" ON "TokenTransaction"("postId");
CREATE INDEX "TokenCashoutRequest_userId_createdAt_idx" ON "TokenCashoutRequest"("userId", "createdAt");
CREATE INDEX "TokenCashoutRequest_status_idx" ON "TokenCashoutRequest"("status");

-- AddForeignKey
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TokenCashoutRequest" ADD CONSTRAINT "TokenCashoutRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
