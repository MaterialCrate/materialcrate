ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "institutionVisibility" TEXT NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS "programVisibility" TEXT NOT NULL DEFAULT 'everyone';

ALTER TABLE "User"
  ALTER COLUMN "institutionVisibility" SET DEFAULT 'everyone',
  ALTER COLUMN "programVisibility" SET DEFAULT 'everyone';

UPDATE "User"
SET
  "institutionVisibility" = CASE
    WHEN COALESCE(NULLIF(BTRIM("institutionVisibility"), ''), 'everyone') IN ('everyone', 'followers', 'only_you')
      THEN COALESCE(NULLIF(BTRIM("institutionVisibility"), ''), 'everyone')
    ELSE 'everyone'
  END,
  "programVisibility" = CASE
    WHEN COALESCE(NULLIF(BTRIM("programVisibility"), ''), 'everyone') IN ('everyone', 'followers', 'only_you')
      THEN COALESCE(NULLIF(BTRIM("programVisibility"), ''), 'everyone')
    ELSE 'everyone'
  END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_institutionVisibility_check'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_institutionVisibility_check"
      CHECK ("institutionVisibility" IN ('everyone', 'followers', 'only_you'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_programVisibility_check'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_programVisibility_check"
      CHECK ("programVisibility" IN ('everyone', 'followers', 'only_you'));
  END IF;
END $$;
