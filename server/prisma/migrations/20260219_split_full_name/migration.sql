-- Split User.fullName into User.firstName and User.surname.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "firstName" TEXT,
ADD COLUMN IF NOT EXISTS "surname" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'User'
      AND column_name = 'fullName'
  ) THEN
    UPDATE "User"
    SET
      "firstName" = NULLIF(split_part(trim(COALESCE("fullName", '')), ' ', 1), ''),
      "surname" = NULLIF(
        trim(regexp_replace(trim(COALESCE("fullName", '')), '^\S+\s*', '')),
        ''
      );
  END IF;
END $$;

ALTER TABLE "User"
DROP COLUMN IF EXISTS "fullName";
