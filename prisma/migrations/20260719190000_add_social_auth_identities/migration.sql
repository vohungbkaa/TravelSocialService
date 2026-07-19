CREATE TYPE "SocialAuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');

CREATE TABLE "SocialAuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "SocialAuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAuthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialAuthIdentity_provider_providerUserId_key"
ON "SocialAuthIdentity"("provider", "providerUserId");

CREATE INDEX "SocialAuthIdentity_userId_idx"
ON "SocialAuthIdentity"("userId");

ALTER TABLE "SocialAuthIdentity"
ADD CONSTRAINT "SocialAuthIdentity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
