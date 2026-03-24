CREATE TABLE "Mute" (
  "muterId" TEXT NOT NULL,
  "mutedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Mute_pkey" PRIMARY KEY ("muterId", "mutedId"),
  CONSTRAINT "Mute_muterId_fkey" FOREIGN KEY ("muterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Mute_mutedId_fkey" FOREIGN KEY ("mutedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Mute_muterId_idx" ON "Mute"("muterId");
CREATE INDEX "Mute_mutedId_idx" ON "Mute"("mutedId");
