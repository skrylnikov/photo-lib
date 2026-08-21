# Repository Guidelines

## Project Structure & Module Organization

This pnpm-workspace Turborepo contains two applications and shared packages. `apps/share-web` is the React/Vite client; keep feature code under `src/entities`, `src/pages`, and `src/shared`. `apps/share-api` is the Fastify/tRPC API, with HTTP handlers in `src/controllers`, routers in `src/routers`, and background work in `src/job`. Reusable UI, types, configuration, database access, and thumbnail processing live in `packages/ui`, `packages/types`, `packages/config`, `packages/database`, and `packages/service-thumbnail`. Prisma schema and migrations are in `packages/database/prisma`.

## Build, Test, and Development Commands

- Use pnpm (standalone install; Corepack is not used). The exact version is pinned via the `packageManager` field and switches automatically per project.
- `pnpm install` installs all workspace dependencies (use the committed `pnpm-lock.yaml`).
- `pnpm dev` starts all development tasks through Turbo; run a single app with `pnpm dev --filter share-web` or `--filter share-api`.
- `pnpm build` builds every workspace; `pnpm lint` runs the repository ESLint checks.
- `pnpm generate` regenerates Prisma Client. Run it after changing `schema.prisma`.
- `pnpm db:migrate:dev` creates/applies local Prisma migrations; `pnpm studio` opens Prisma Studio.
- `docker compose -f compose-dev.yaml up -d` starts local PostgreSQL and Redis.

There is no automated test script currently. For every change, run the relevant lint command and build; manually exercise the affected API route or UI flow.

## Coding Style & Naming Conventions

Write strict TypeScript and follow the existing ESLint configuration (`eslint-kit`, Prettier, React, and Effector rules). Prettier uses semicolons; preserve the local file's quote and indentation style rather than reformatting unrelated code. Use `camelCase` for values and functions, `PascalCase` for React components/types, and lowercase kebab-case for package directories. Keep frontend imports on the established `@/` aliases where applicable.

## Database, Configuration, and Security

Never commit secrets or machine-specific paths. Copy and adapt `example.env` locally; deployment overrides belong in an untracked `share.prod.yml`. Add schema changes as timestamped Prisma migration directories—do not edit existing migrations. Treat `STORAGE_PATH`, `DATABASE_URL`, and `TG_BOT_TOKEN` as sensitive deployment configuration.

## Commits & Pull Requests

History uses short imperative, lowercase subjects such as `fix cache`, `update deps`, and `add tg bot for upload photo`. Keep commits focused and describe the affected area. PRs should state the user-visible change, configuration/migration impact, verification commands, and include screenshots for frontend changes. Link the relevant issue when one exists.
