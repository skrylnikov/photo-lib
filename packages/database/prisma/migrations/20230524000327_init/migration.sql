-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "camera" TEXT,
    "orientation" TEXT,
    "exposureTime" DOUBLE PRECISION,
    "iso" INTEGER,
    "date" TIMESTAMP(3),
    "aperture" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "lens" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "rotate" DOUBLE PRECISION,
    "scaleX" DOUBLE PRECISION,
    "scaleY" DOUBLE PRECISION,
    "vibrant" TEXT,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);
