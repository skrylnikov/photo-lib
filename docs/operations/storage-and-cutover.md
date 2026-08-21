# Storage, import, backup, and cutover

The new library is deliberately isolated from the legacy deployment. Do not point
the new service at the legacy PostgreSQL volume, legacy local-originals directory,
or the legacy Redis instance.

## Persistent data boundaries

| Data | Volume | Recovery policy |
| --- | --- | --- |
| RustFS `photo-library` bucket | `rustfs-data` | Durable source of truth; back up or replicate the bucket. |
| SQLite database | `photo-library-db` | Back up while the single API replica is stopped, or after a coordinated WAL checkpoint. |
| Derivative cache | `photo-library-cache` | Disposable; rebuild from RustFS derivatives on cache miss. |
| Processing temporary files | `photo-library-tmp` | Disposable; remove after restart if needed. |

RustFS originals and derivatives must be backed up together with the SQLite
metadata backup. SQLite contains references, publication state, jobs, and
sessions; it does not contain the media bytes. Cache and tmp volumes must not be
treated as backups.

## One-time legacy import

Use the administrator-controlled CLI only against a copied, read-only legacy
originals directory. It validates content and pixel/byte limits before creating
an immutable `originals/import-*` object and a pending processing job. It does
not inspect or migrate the legacy PostgreSQL schema.

```bash
pnpm --filter share-api import:legacy -- \
  --source /srv/legacy-originals-copy \
  --created-by pocket-id-subject \
  --confirm
```

Run a dry-run first; it performs content validation and reports counts without
writing SQLite or RustFS:

```bash
pnpm --filter share-api import:legacy -- \
  --source /srv/legacy-originals-copy \
  --dry-run
```

The CLI is intentionally one-time and non-destructive. It does not delete the
legacy directory or publish imported media. The admin must verify processing,
curate album membership, and publish explicitly.

## Browser presigned uploads

`RUSTFS_ENDPOINT` must be reachable by the browser, not only by the API
container. In local development use the host RustFS URL. In production use the
public HTTPS RustFS/S3 endpoint or a reverse proxy with the same host visible in
the presigned URL.

Configure the private bucket with CORS for the exact web origin and only the
required methods/headers:

```json
[
  {
    "AllowedOrigins": ["https://photos.example.com"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type", "x-amz-content-sha256", "x-amz-date"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

Apply the policy using the RustFS/S3 administration tooling for the
`photo-library` bucket. Never add an anonymous `GetObject` policy; public media
is served only through the API publication check.

## Reversible cutover

1. Keep the legacy deployment, volumes, and DNS route unchanged.
2. Start the new stack with a new SQLite volume and a separate RustFS bucket.
3. Run the import dry-run, then the confirmed import; wait for all jobs to reach
   `ready` or an explicitly reviewed `failed` state.
4. Verify anonymous unpublished/public album boundaries, Pocket ID admin login,
   upload completion, derivatives, and a cache miss after removing a cache file.
5. Switch the web/proxy route to the new stack without deleting the legacy
   stack or either media bucket.
6. Roll back by switching the route to the unchanged legacy service. Keep new
   objects and SQLite for investigation; do not attempt an in-place reverse
   migration into the legacy PostgreSQL schema.
