# Synthetic tiled HEVC fixtures

These files are generated test patterns. They contain no camera data, EXIF,
XMP, GPS, or other user metadata.

- `tiled-6x8.heic`: 6 columns by 8 rows, 48 `dimg` references, 384×512
  pixels, identity orientation.
- `tiled-17x16-over-budget.heic`: 17 columns by 16 rows, 272 `dimg`
  references, 1088×1024 pixels, identity orientation. It exceeds the custom
  libvips `max_items = 256` compatibility budget.

Regenerate both fixtures from deterministic RGB sources with libheif's
`heif-enc` and the workspace Sharp version:

```bash
fnm exec --using=v24.13.0 -- node test-fixtures/heic/generate-fixtures.mjs
```

The committed fixtures were generated with libheif 1.20.2 and are revalidated
against the newer libheif version pinned in `apps/share-api/Dockerfile`.
Validate them with the repository tests and:

```bash
heif-info -d test-fixtures/heic/tiled-6x8.heic
```

`iphone-original.HEIC` is an ignored local manual oracle and must never be
committed.

## Manual oracle result

On 2026-08-18 the ignored oracle passed the pinned Docker runtime as HEIF at
3024×4032. Its SHA-256 stayed unchanged while the full processing helper
created 15 derivatives: JXL, AVIF, HEIC/HEVC, WebP, and JPEG at requested
widths 640, 1280, and 2560. The observed output dimensions were respectively
640×853, 1280×1707, and 2560×3413 for every codec. No EXIF, XMP, or GPS values
were recorded.
