# Legacy inventory for `rebuild-photo-library`

This inventory records the repository state before implementing the rewrite. The
working tree already contained an unrelated modernization pass; it remains
preserved and must not be reset, reverted, staged, or silently folded into the
rewrite.

## Existing legacy runtime surfaces

- API: Fastify on port `4001`, tRPC under `/trpc`, `GET /health`, and a root
  greeting route.
- Public tRPC: `image.list`, returning the flat `Image`/`File`/`Thumbnail`
  model and thumbnail metadata.
- Static storage: `/storage/thumbnails/*` exposes the local thumbnail cache;
  `/storage/file/*` exposes original files from `STORAGE_PATH`.
- Administrative/indexing surface: `GET /reindex` exists in
  `apps/share-api/src/controllers/storage.ts` (the controller is not currently
  registered by `src/index.ts`).
- Telegram: `grammy` starts a bot when `TG_BOT_TOKEN` is present; `/help`,
  `/start`, `/reindex`, photo/document uploads, Telegram file downloads, and
  local writes to the originals directory are implemented in `src/bot.ts`.
- Storage indexing: `src/job/index-storage.ts` recursively scans the local
  originals directory, creates legacy Prisma records, and invokes the
  thumbnail service. `reindexStorage` deletes legacy records and clears the
  thumbnail cache.

## Legacy configuration and deployment

- Environment variables: `STORAGE_PATH`, `CACHE_PATH`, `DATABASE_URL`,
  `REDDIS_HOST`/`REDDIS_PORT` (including the existing spelling inconsistencies),
  and `TG_BOT_TOKEN`.
- Local Compose starts PostgreSQL and Redis with `db-data` volume.
- `share.yml` starts separate web, API, Prisma migration, PostgreSQL, and Redis
  services; API mounts `/mnt/cache/thumbnails` and reads originals from
  `/mnt/images`.
- `config/postgresql.conf`, PostgreSQL connection defaults, and PostgreSQL
  migration metadata are legacy-only.
- Runtime dependencies include PostgreSQL Prisma adapter, Redis/BullMQ/
  `ioredis`, `grammy`, and the legacy thumbnail worker. The image runtime is
  Sharp, but current processing is coupled to the legacy thumbnail package.

## Legacy workspace and UI packages

- Workspaces are `apps/share-web`, `apps/share-api`, and shared packages
  `config`, `database`, `eslint-config-custom`, `service-thumbnail`, `tsconfig`,
  `types`, and `ui`.
- The web client imports Effector/`effector-react`, Emotion/Linaria, the flat
  `image.list` contract, and legacy `ui` grid/full components.
- `packages/types` models `Image`, `File`, and `Thumbnail`; `packages/ui`
  builds URLs directly from `/storage/...` paths.

## Pre-existing dirty worktree, kept out of this change

`git status --short` showed modifications across the legacy applications,
packages, Dockerfiles, Compose, root manifests, Prisma client setup, and the
lockfile, plus untracked local instruction/OpenSpec/runtime-support files.
The tracked modernization includes Node/npm/Turbo/TypeScript and dependency
version updates, removal of per-package ESLint config files, Fastify/tRPC
compatibility edits, stricter TypeScript guards, and generated Prisma/config
support files. These changes are treated as user-owned baseline work. Future
tasks may replace legacy implementation files as specified, but unrelated
modernization edits must remain intact.

## Replacement boundary

The rewrite replaces the legacy API/storage/job/auth surfaces with one SQLite
API process, private RustFS object storage, an in-process sequential job runner,
Pocket ID OIDC, album/publication contracts, controlled derivative routes, and
one web application with `/admin`. It does not mutate legacy deployment/data as
part of the cutover preparation.
