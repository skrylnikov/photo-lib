## Context

See [proposal.md](proposal.md) for motivation. The npm-workspace has one committed `package-lock.json`, no declared Node or npm version policy, and three Docker build paths pinned to Node 18. Direct dependencies span the API, web client, shared packages, Prisma, image processing, Telegram integration, and the queue worker. The project currently uses Turbo's deprecated `pipeline` configuration and a legacy TypeScript `moduleResolution: "node"` setting.

At planning time, Node 26.7.0 is the latest Current release. The user explicitly selected the Current line so the project receives the newest stable Node capabilities; this requires a deliberate ongoing update cadence rather than treating the runtime as a long-lived LTS baseline.

## Goals / Non-Goals

**Goals:**

- Make the entire workspace reproducible on one explicitly pinned Node Current/npm toolchain.
- Bring every direct runtime and development dependency to its latest stable release available during implementation, including major versions.
- Resolve all resulting compatibility changes without intentionally changing existing API endpoints, browser workflows, persisted data, environment variables, ports, or development-service connection settings.
- Establish verification that exercises clean installation, generated code, lint, builds, container images, and representative runtime paths.

**Non-Goals:**

- Adding product features, redesigning the client, or changing public API semantics.
- Replacing npm, the workspace layout, PostgreSQL, Redis, Fastify, tRPC, React, or Prisma solely because an alternative is newer.
- Rewriting historical Prisma migrations or applying destructive database resets.
- Upgrading external deployment infrastructure that is not declared in this repository.

## Decisions

### Use the latest Node Current release, pinned exactly, for local and container execution

Add a repository-level Node version file and `engines`/`packageManager` metadata using the latest Current patch available when the change is applied (26.7.0 at planning time). Update all Node Docker stages to that same version line. This keeps local development, `npm ci`, generated native modules, and containers on one explicit ABI.

The Current line is selected by explicit product direction. An LTS baseline is rejected because it would not meet the requested Current runtime policy; leaving version selection implicit is rejected because it permits mismatched native dependencies such as Sharp.

### Retain npm and upgrade the complete direct dependency set in one controlled lockfile refresh

Keep npm because the repository already commits `package-lock.json` and its Dockerfiles use `npm ci`. Inventory all root and workspace manifests, update every external direct dependency to the registry's stable `latest` dist-tag (including majors), then regenerate a single lockfile with the pinned npm version. Local workspace links (`"*"`) remain workspace links and are not replaced by registry packages.

Using only `npm update` is rejected because it obeys existing ranges and would leave the requested major-version upgrades behind. Keeping obsolete versions to reduce migration effort is also rejected by the requested scope.

### Perform breaking migrations by integration boundary, not by package name

After the version refresh, adapt code and configuration in dependency-aware groups:

1. workspace/tooling: npm metadata, Turbo tasks, TypeScript module-resolution settings, ESLint flat-config migration, and Prettier formatting;
2. database: Prisma configuration, generated client location/imports, schema validation, and migration commands while preserving migration history;
3. API: Fastify plugins, tRPC server/client adapters and inferred shared types, Undici, GrammY, validation, and static-file handling;
4. web/UI: React, React DOM, Vite, Effector ecosystem packages, Emotion, animation/gallery packages, and the Vite Babel plugin;
5. background/native code: BullMQ, Threads, Sharp, Sharp Vibrant, EXIF parsing, and thumbnail worker startup;
6. containers/services: reproducible Docker builds, non-root runtime where compatible, and current compatible PostgreSQL/Redis development images.

This isolates failures to an executable integration boundary and keeps tRPC client/server versions aligned. A package-by-package migration is rejected because the shared types package imports the API router and would hide coupled breakage.

### Preserve data and service contracts during Prisma and Compose upgrades

Use `prisma generate`, schema validation, and a disposable database to validate the new Prisma major version before running `prisma migrate deploy` against any non-disposable environment. Never edit existing migration directories. Keep the Compose service names, ports, credentials, volume semantics, and application connection URLs unchanged; only change image tags after confirming the application works against them.

An in-place reset or migration history rewrite is rejected because it risks user data and is not required for a dependency modernization.

### Require clean, layered verification and an explicit compatibility ledger

Run a clean `npm ci` on the pinned toolchain before finalizing the lockfile, then generation, lint, build, Docker image builds, and representative API/web/worker/manual smoke checks. Record each major-version migration and any unavoidable compatibility adjustment in the change implementation notes/commit message. Failed upstream peer-dependency requirements must be resolved by compatible package selection or code migration, never by blanket `--force` or `--legacy-peer-deps`.

## Risks / Trade-offs

- [Several simultaneous major migrations can obscure the cause of a regression] → Commit and verify by the integration boundaries above; retain a migration ledger and bisectable intermediate commits if necessary.
- [Prisma's major upgrade can alter generated-client configuration and engine behavior] → Generate and validate against a disposable database first; preserve schema and migration history; run deploy migration only after review.
- [Native Sharp binaries and Alpine/glibc differences can break Docker builds] → Pin Node consistently, use a Linux image variant compatible with Sharp's supported prebuilt binaries, and build each production image from a clean context.
- [Node Current has a shorter support window and a newer Current patch can introduce a breaking runtime change] → Review the Node release status before each dependency-maintenance cycle, keep the version pin and container images aligned, and schedule the next Current upgrade before the selected line reaches end of life.
- [React/Vite/Effector and tRPC have cross-package type compatibility constraints] → Upgrade coupled packages together and build the web/API/types workspace as a unit.
- [New PostgreSQL or Redis image majors may change defaults] → Keep service contracts stable and validate both application startup and thumbnail queue processing against the refreshed Compose stack.
- [The registry's `latest` tags can advance after planning] → Resolve and record exact versions at apply time, then rely on the regenerated lockfile for reproducibility.

## Migration Plan

1. Capture the starting lockfile, workspace dependency inventory, current Node/npm versions, and clean baseline build/lint results.
2. Pin the current Node Current/npm toolchain and align Docker build stages before installing new dependency versions.
3. Upgrade manifests and regenerate the lockfile without force/legacy peer-dependency flags.
4. Apply compatibility migrations in the defined integration-boundary order; run scoped checks after each boundary.
5. Start the refreshed local PostgreSQL/Redis stack with disposable data; generate Prisma Client, validate schema, apply migrations only to that database, and smoke the API, web client, and thumbnail queue.
6. Build all production Docker images from clean contexts and verify their startup commands and exposed service behavior.
7. Publish only after the full verification matrix passes and exact Node/npm/dependency/image versions are documented.

Rollback is a source and image rollback to the preceding commit and lockfile. No destructive data rollback is planned: no migration is altered or reset; a production migration, if any is required by an upstream tool, must have its own reviewed backup and rollback procedure before execution.

## Open Questions

- Which deployment platform builds the three Dockerfiles, and can it select the pinned Node/npm version without an additional CI/deployment configuration change? This can be established during apply before an image is published.
