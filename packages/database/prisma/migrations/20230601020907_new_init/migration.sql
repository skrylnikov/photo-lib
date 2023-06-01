/*
  Warnings:

  - You are about to drop the `Photo` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('Image', 'Video', 'Metadata', 'Raw', 'Unknown');

-- CreateEnum
CREATE TYPE "ThumbnailSize" AS ENUM ('x1', 'x2', 'full');

-- CreateEnum
CREATE TYPE "ThumbnailFormat" AS ENUM ('jpeg', 'webp', 'avif');

-- DropTable
DROP TABLE "Photo";

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "exif" JSONB,
    "camera" TEXT,
    "exposureTime" DOUBLE PRECISION,
    "iso" INTEGER,
    "aperture" DOUBLE PRECISION,
    "lens" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "Vibrant" TEXT,
    "Muted" TEXT,
    "DarkVibrant" TEXT,
    "DarkMuted" TEXT,
    "LightVibrant" TEXT,
    "LightMuted" TEXT,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" "FileType" NOT NULL,
    "extension" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "primary" BOOLEAN NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "rotate" DOUBLE PRECISION,
    "scaleX" DOUBLE PRECISION,
    "scaleY" DOUBLE PRECISION,
    "imageId" TEXT,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thumbnail" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "size" "ThumbnailSize" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "imageId" TEXT,

    CONSTRAINT "Thumbnail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "File_path_key" ON "File"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Thumbnail_path_key" ON "Thumbnail"("path");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thumbnail" ADD CONSTRAINT "Thumbnail_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
