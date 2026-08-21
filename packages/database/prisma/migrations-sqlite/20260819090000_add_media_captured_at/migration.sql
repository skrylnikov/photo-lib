-- Store only the normalized capture instant; existing rows remain compatible
-- and use createdAt until processing or read-time fallback supplies a value.
ALTER TABLE "MediaAsset" ADD COLUMN "capturedAt" DATETIME;

CREATE INDEX "MediaAsset_capturedAt_idx" ON "MediaAsset"("capturedAt");
