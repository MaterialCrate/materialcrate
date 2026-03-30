UPDATE "User"
SET "visibilityPublicPosts" = false
WHERE "visibilityPublicProfile" = false
  AND "visibilityPublicPosts" = true;

ALTER TABLE "User"
ADD CONSTRAINT "User_visibility_profile_posts_consistency_check"
CHECK (
  "visibilityPublicProfile" = true
  OR "visibilityPublicPosts" = false
);
