# Implementation notes

## Baseline

- Runtime: Node `v26.7.0`; npm `11.19.0`.
- Lockfile: npm lockfile version `2` before the refresh.
- Docker images before the refresh: `node:18`, `node:18-alpine` (API, web, database); Compose services `postgres:15-alpine` and `redis:7-alpine`.
- Baseline `npm run lint` and `npm run build` were both blocked before package installation: no local Turbo was installed, the global Turbo was `2.8.14`, and it rejected the legacy `globalDotEnv` key in `turbo.json`.

## Registry ledger

The npm `latest` dist-tags and package metadata were queried on 2026-08-17. Internal workspace links (`*`) are intentionally omitted from this external-dependency ledger.

| Package | Selected version | Node engine from registry |
| --- | --- | --- |
| `@fastify/static` | `10.1.3` | none |
| `@babel/core` | `7.29.7` | `>=6.9.0` |
| `@prisma/client` | `7.9.1` | `^20.19 || ^22.12 || >=24.0` |
| `@prisma/adapter-pg` | `7.9.1` | none |
| `@rolldown/plugin-babel` | `0.2.3` | `>=22.12.0 || ^24.0.0` |
| `@types/node` | `26.2.0` | none |
| `@types/react` | `19.2.18` | none |
| `@types/react-dom` | `19.2.4` | none |
| `@vitejs/plugin-react` | `6.0.5` | `^20.19.0 || >=22.12.0` |
| `@emotion/core` | `11.0.0` | none |
| `@emotion/react` | `11.14.0` | none |
| `@emotion/styled` | `11.14.1` | none |
| `@eslint/js` | `10.0.1` | `^20.19.0 || ^22.13.0 || >=24` |
| `@linaria/core` | `8.2.0` | `>=22.12.0` |
| `@trpc/client` | `11.18.0` | none |
| `@trpc/server` | `11.18.0` | none |
| `bullmq` | `6.1.2` | `>=14.17.0` |
| `dotenv` | `17.4.2` | `>=12` |
| `eslint` | `10.8.1` | `^20.19.0 || ^22.13.0 || >=24` |
| `eslint-config-prettier` | `10.1.8` | none |
| `eslint-plugin-react-hooks` | `7.1.1` | `>=18` |
| `effector` | `23.4.4` | `>=11.0.0` |
| `effector-logger` | `0.15.0` | none |
| `effector-react` | `23.3.0` | `>=11.0.0` |
| `exifr` | `7.1.3` | none |
| `fastify` | `5.12.0` | none |
| `framer-motion` | `13.1.0` | none |
| `grammy` | `1.45.1` | `^12.20.0 || >=14.13.1` |
| `ioredis` | `6.0.0` | `>=20.0.0` |
| `patronum` | `2.3.0` | none |
| `photo-flex-layout` | `1.0.0` | `>=16` |
| `photoswipe` | `5.4.4` | `>=0.12.0` |
| `prettier` | `3.9.6` | `>=14` |
| `prisma` | `7.9.1` | `^20.19 || ^22.12 || >=24.0` |
| `react` | `19.2.8` | `>=0.10.0` |
| `react-dom` | `19.2.8` | none |
| `react-use` | `17.6.1` | none |
| `remeda` | `2.41.0` | `>=18.0.0` |
| `sharp` | `0.35.3` | `>=20.9.0` |
| `threads` | `1.7.0` | none |
| `tsup` | `8.5.1` | `>=18` |
| `tsx` | `4.23.12` | `>=18.0.0` |
| `turbo` | `2.10.10` | none |
| `typescript` | `5.9.3` | `>=14.17` |
| `typescript-eslint` | `8.67.0` | `^18.18.0 || ^20.9.0 || >=21.1.0` |
| `undici` | `8.10.0` | `>=22.19.0` |
| `use-resize-observer` | `10.0.0` | none |
| `vite` | `8.2.1` | `^20.19.0 || >=22.12.0` |
| `vite-tsconfig-paths` | `6.1.1` | none |
| `zod` | `4.4.3` | none |

## Peer decisions

- Registry `typescript@latest` was `7.0.2`, but `typescript-eslint@8.67.0` requires TypeScript `<6.1.0`; `5.9.3` is the latest compatible stable line selected for the required TypeScript ESLint parser.
- Registry `eslint-kit@latest` was `11.39.0`, but it requires ESLint `^8.57.0`; the repository now uses ESLint `10.8.1` and a root flat config, so `eslint-kit` and the obsolete `eslint-config-turbo` dependency were removed.
- Registry `eslint-plugin-react@latest` does not declare ESLint 10 support; the flat config uses the ESLint core and TypeScript rules plus the ESLint-10-compatible React Hooks plugin, without adding that incompatible plugin.
- Registry `sharp-vibrant@latest` is still `0.4.0` with peer `sharp@^0.29.3` and no source import exists; it was removed so Sharp can move to `0.35.3` without a peer override.
- PostgreSQL 18 requires the volume mount at `/var/lib/postgresql` rather than the pre-18 `/var/lib/postgresql/data`; the Compose mount was changed accordingly to keep the named volume contract while allowing the new image to initialize.
- Vite 8's React plugin no longer exposes the old inline Babel integration used by this repository; the official Rolldown Babel bridge is used for the existing Effector transform. Babel `7.29.7` is selected instead of registry-latest Babel 8 because the current Effector plugin is not Babel 8-compatible.
- `@linaria/core` was added because it is imported by the existing web source but was absent from the manifest.

## Migration verification so far

- `npm install` completed without `--force` or `--legacy-peer-deps`; the lockfile is now npm lockfile version `3`.
- A clean `npm ci` from that lockfile completed successfully.
- Turbo 2.10.10 workspace lint completes with warnings only; build completes for all workspaces. Vite reports existing absolute font URL warnings and the supported `vite-tsconfig-paths` advisory.
- Prisma 7 generation and schema validation pass; a package-local `prisma.config.ts` is required for migration commands executed from `packages/database`, while the repository-level config remains the Docker/root CLI entry point.
- Prisma 7 direct PostgreSQL runtime requires the official `@prisma/adapter-pg` driver adapter; the database client now creates `PrismaPg` from the existing `DATABASE_URL`.
- BullMQ 6's native ESM path requires the optional `ioredis` peer to be installed explicitly; `ioredis@6.0.0` is now a service-thumbnail runtime dependency.

## Final verification

- Clean dependency verification: removed workspace `node_modules` trees and ran `npm ci` with npm `11.19.0`; no force or legacy-peer-dependency flags were used.
- Prisma verification: `npm run generate` and `npm exec prisma validate -- --schema packages/database/prisma/schema.prisma` passed with Prisma `7.9.1`.
- Static checks: `npm run lint` passed with one pre-existing `react-hooks/exhaustive-deps` warning in `apps/share-web/src/pages/home/index.tsx`; API, web, types, and UI TypeScript no-emit checks passed.
- Workspace build: `npm run build` passed for all nine workspaces. Vite retained the existing absolute-font and `vite-tsconfig-paths` advisories; the tracked legacy `apps/share-web/src/dist` artifact was restored after verification.
- Docker: clean `--no-cache` builds passed for `photo-lib-upgrade-api:local`, `photo-lib-upgrade-web:local`, and `photo-lib-upgrade-database:local` from `node:26.7.0-bookworm-slim`; all use npm `11.19.0`, Turbo `2.10.10`, positional `turbo prune`, and Prisma 7 generation. OpenSSL is installed in every Prisma build path.
- Disposable Compose smoke: `postgres:18-alpine` and `redis:8-alpine` were started under project `photo-lib-upgrade`; PostgreSQL reported accepting connections and Redis returned `PONG`. Existing migrations deployed successfully to that disposable database without migration-file changes.
- API/worker smoke: the built API returned `200` from `/health` and `/`, served an existing thumbnail with `200`, and returned the existing tRPC `image.list` shape. A representative PNG produced four queued/processed thumbnails (WebP/AVIF, preview/full) with the Redis queue drained.
- Manual web smoke: the Vite client loaded the image list, opened the existing full-image PhotoSwipe workflow, and closed it without a fatal browser error.
- Deployment inspection: `share.yml` builds the updated API, web, and Prisma-migrate Dockerfiles, so its Node/npm policy follows those Dockerfiles. Its separately declared PostgreSQL 15/Redis 7 deployment services were not changed because this change scopes service-image refresh to `compose-dev.yaml`; verify those out-of-repository deployment services before publishing.
- Final diff review found no historical Prisma migration changes, new secrets, or unrelated tracked edits. Existing untracked user files (`.agents/`, `.opencode/`, `AGENTS.md`) were preserved.
