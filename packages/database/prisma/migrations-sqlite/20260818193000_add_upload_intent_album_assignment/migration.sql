-- Additive workflow metadata for album-aware uploads. Existing intents remain
-- compatible because the new fields are nullable/defaulted and no existing
-- album, media, or derivative rows are rewritten.
ALTER TABLE "UploadIntent" ADD COLUMN "targetAlbumId" TEXT;
ALTER TABLE "UploadIntent" ADD COLUMN "assignmentStatus" TEXT NOT NULL DEFAULT 'not_requested';
ALTER TABLE "UploadIntent" ADD COLUMN "assignmentError" TEXT;

CREATE INDEX "UploadIntent_targetAlbumId_assignmentStatus_idx"
ON "UploadIntent"("targetAlbumId", "assignmentStatus");
