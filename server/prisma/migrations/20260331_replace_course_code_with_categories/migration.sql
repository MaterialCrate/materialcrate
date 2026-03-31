ALTER TABLE "Post"
RENAME COLUMN "courseCode" TO "categories";

ALTER TABLE "Post"
ALTER COLUMN "categories" TYPE TEXT[]
USING ARRAY["categories"];

DROP INDEX IF EXISTS "Post_courseCode_idx";
CREATE INDEX IF NOT EXISTS "Post_categories_idx" ON "Post" USING GIN ("categories");

ALTER TABLE "Post"
ADD CONSTRAINT "Post_categories_max_3_check"
CHECK (cardinality("categories") <= 3);

ALTER TABLE "PostVersion"
RENAME COLUMN "courseCode" TO "categories";

ALTER TABLE "PostVersion"
ALTER COLUMN "categories" TYPE TEXT[]
USING ARRAY["categories"];

ALTER TABLE "PostVersion"
ADD CONSTRAINT "PostVersion_categories_max_3_check"
CHECK (cardinality("categories") <= 3);
