ALTER TABLE "UserProfile" RENAME COLUMN "displayName" TO "fullName";

-- Social accounts authenticate by provider identity. When an email is
-- available, keep the required username field aligned with that email.
UPDATE "User" AS target
SET "username" = lower(target."email")
WHERE target."email" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "SocialAuthIdentity" AS identity
    WHERE identity."userId" = target."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "User" AS other
    WHERE other."id" <> target."id"
      AND other."username" = lower(target."email")
  );
