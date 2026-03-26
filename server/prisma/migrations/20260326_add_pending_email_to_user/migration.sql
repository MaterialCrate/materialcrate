ALTER TABLE "User"
ADD COLUMN "pendingEmail" TEXT;

CREATE INDEX "User_pendingEmail_idx" ON "User"("pendingEmail");
