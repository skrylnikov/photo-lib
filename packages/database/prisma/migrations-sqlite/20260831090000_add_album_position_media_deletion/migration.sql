PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Album" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "position" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Album" (
    "id", "position", "slug", "title", "description", "published",
    "publishedAt", "createdAt", "updatedAt"
)
SELECT
    "id",
    ROW_NUMBER() OVER (
        ORDER BY
            "published" DESC,
            CASE WHEN "published" THEN "publishedAt" END DESC,
            CASE WHEN NOT "published" THEN "updatedAt" END DESC,
            "id" ASC
    ) - 1,
    "slug", "title", "description", "published", "publishedAt", "createdAt", "updatedAt"
FROM "Album";

DROP TABLE "Album";
ALTER TABLE "new_Album" RENAME TO "Album";
CREATE UNIQUE INDEX "Album_position_key" ON "Album"("position");
CREATE UNIQUE INDEX "Album_slug_key" ON "Album"("slug");
CREATE INDEX "Album_published_updatedAt_idx" ON "Album"("published", "updatedAt");

CREATE TABLE "MediaDeletion" (
    "mediaId" TEXT NOT NULL PRIMARY KEY,
    "originalKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "MediaDeletion_availableAt_idx" ON "MediaDeletion"("availableAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
