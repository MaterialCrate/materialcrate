UPDATE "Notification" AS n
SET "profilePicture" = u."profilePicture"
FROM "User" AS u
WHERE n."profilePicture" IS NULL
  AND u."profilePicture" IS NOT NULL
  AND (
    LOWER(u."displayName") = LOWER(
      REGEXP_REPLACE(
        n."description",
        ' (started following you\.|liked your post\.|commented on your post\.|replied to a thread on your post\.|liked your comment\.)$',
        ''
      )
    )
    OR LOWER(u."username") = LOWER(
      REGEXP_REPLACE(
        n."description",
        ' (started following you\.|liked your post\.|commented on your post\.|replied to a thread on your post\.|liked your comment\.)$',
        ''
      )
    )
  );
