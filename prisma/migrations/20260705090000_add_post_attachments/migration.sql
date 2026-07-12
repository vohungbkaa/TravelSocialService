CREATE TYPE "PostAttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'FILE', 'LINK');

CREATE TABLE "PostAttachment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "PostAttachmentType" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostAttachment_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF to_regclass('"PostImage"') IS NOT NULL THEN
        INSERT INTO "PostAttachment" (
            "id",
            "postId",
            "type",
            "url",
            "sortOrder",
            "createdAt"
        )
        SELECT
            "id",
            "postId",
            'IMAGE'::"PostAttachmentType",
            "imageUrl",
            "sortOrder",
            "createdAt"
        FROM "PostImage";
    END IF;
END $$;

CREATE INDEX "PostAttachment_postId_sortOrder_idx" ON "PostAttachment"("postId", "sortOrder");

ALTER TABLE "PostAttachment" ADD CONSTRAINT "PostAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
