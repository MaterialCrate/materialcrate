-- Replace firstName/surname with required displayName on User.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "displayName" TEXT;

UPDATE "User"
SET "displayName" = COALESCE(
  NULLIF(trim(COALESCE("displayName", '')), ''),
  NULLIF(trim(CONCAT(COALESCE("firstName", ''), ' ', COALESCE("surname", ''))), ''),
  NULLIF(trim(COALESCE("username", '')), ''),
  NULLIF(split_part(COALESCE("email", ''), '@', 1), ''),
  'User'
)
WHERE "displayName" IS NULL OR trim("displayName") = '';

ALTER TABLE "User"
ALTER COLUMN "displayName" SET NOT NULL;

ALTER TABLE "User"
DROP COLUMN IF EXISTS "firstName",
DROP COLUMN IF EXISTS "surname",
DROP COLUMN IF EXISTS "fullName";
