ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "profileBackground" TEXT NOT NULL DEFAULT 'bg-linear-to-br from-[#E1761F] via-[#ffecdc] to-stone-200';
