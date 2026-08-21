## Why

The workspace is anchored to a 2023-era toolchain: TypeScript 5.1, Turbo 1, Prisma 4, React 18, Vite 4, ESLint 8, and Node 18 container images. This prevents the project from benefiting from supported runtimes, current dependency fixes, and modern build tooling, while major-version gaps make an unplanned upgrade unnecessarily risky.

## What Changes

- Upgrade the declared Node.js runtime and every Node-based Docker build stage to the latest Node.js Current release, with an explicit repository-level version policy.
- Upgrade all direct production and development dependencies in every npm workspace to their current stable releases, including major versions, and regenerate `package-lock.json` with the committed npm version.
- **BREAKING** Adapt application, database, build, lint, and container code to the supported APIs and configuration formats of the upgraded packages (including Prisma, tRPC, Fastify, React/Vite, Turbo, ESLint, TypeScript, Sharp, and queue/worker libraries).
- Modernize workspace, TypeScript, Turbo, ESLint, and Docker configuration so clean installs, generated Prisma Client, builds, linting, and production images work on the selected Node version.
- Refresh development service images in `compose-dev.yaml` where a supported compatible release is available, preserving the existing PostgreSQL and Redis service contracts.
- Retain the current public API routes, browser workflows, database data, environment-variable names, service ports, and deployment intent unless an upstream migration makes a documented compatibility adjustment unavoidable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a tooling and compatibility migration; it must preserve existing externally observable product behavior.

## Impact

- Root and all workspace `package.json` manifests; `package-lock.json`; Node version metadata to be introduced or updated.
- `turbo.json`, shared TypeScript and ESLint configuration, plus code touched by major-version migrations.
- Prisma schema/client generation and migration tooling in `packages/database`.
- Dockerfiles for `share-api`, `share-web`, and `database`, and the PostgreSQL/Redis development images.
- All build, lint, Prisma-generation, migration, API, web, thumbnail-worker, Telegram-bot, and container smoke verification paths.
