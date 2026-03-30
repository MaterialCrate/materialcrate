UPDATE "User"
SET
  "visibilityPublicProfile" = COALESCE("visibilityPublicProfile", true),
  "visibilityPublicPosts" = COALESCE("visibilityPublicPosts", true),
  "visibilityPublicComments" = COALESCE("visibilityPublicComments", true),
  "visibilityOnlineStatus" = COALESCE("visibilityOnlineStatus", true);

ALTER TABLE "User"
ALTER COLUMN "visibilityPublicProfile" SET DEFAULT true,
ALTER COLUMN "visibilityPublicPosts" SET DEFAULT true,
ALTER COLUMN "visibilityPublicComments" SET DEFAULT true,
ALTER COLUMN "visibilityOnlineStatus" SET DEFAULT true,
ALTER COLUMN "visibilityPublicProfile" SET NOT NULL,
ALTER COLUMN "visibilityPublicPosts" SET NOT NULL,
ALTER COLUMN "visibilityPublicComments" SET NOT NULL,
ALTER COLUMN "visibilityOnlineStatus" SET NOT NULL;
