## 1. Establish the reproducible baseline

- [x] 1.1 Record the starting Node/npm versions, every direct external dependency in all workspace manifests, lockfile format, Docker base/service images, and baseline lint/build outcomes.
- [x] 1.2 Query the npm registry at implementation time for the stable `latest` releases and required Node engine ranges of every direct dependency; document the exact selected versions and incompatible peers.
- [x] 1.3 Add repository-level Node version metadata plus root `engines` and `packageManager` fields pinned to the latest Node Current/npm patch selected for the change.

## 2. Modernize workspace tooling and dependency resolution

- [x] 2.1 Update every direct external dependency and development dependency in the root, applications, and packages to the approved current stable releases, preserving internal workspace links.
- [x] 2.2 Regenerate the single `package-lock.json` with the pinned npm version; resolve peer constraints through compatible package versions or source migrations, without force or legacy-peer-dependency flags.
- [x] 2.3 Migrate `turbo.json`, shared TypeScript configuration, and ESLint/Prettier configuration to the current supported formats; update npm scripts only where required by those tools.
- [x] 2.4 Run a clean `npm ci`, scoped lint, and scoped build after the tooling migration; correct only migration-induced configuration or type errors.

## 3. Migrate database and API integrations

- [x] 3.1 Upgrade Prisma Client and CLI together; adapt Prisma configuration, schema/generator settings, generated-client imports, and database package scripts while leaving historical migrations untouched.
- [x] 3.2 Validate Prisma schema and Client generation against a disposable PostgreSQL database, then run migration deployment only against that disposable database and verify the application can initialize it.
- [x] 3.3 Upgrade and migrate Fastify, `@fastify/static`, tRPC server/client adapters, Zod, Undici, GrammY, and shared router-type imports as one API compatibility boundary.
- [x] 3.4 Verify API startup, `/health`, static-file handling, the existing tRPC image procedures, and the Telegram bot initialization with the upgraded packages.

## 4. Migrate web, UI, and background-worker integrations

- [x] 4.1 Upgrade and adapt React, React DOM, Vite, the React Vite plugin, Effector ecosystem libraries, Emotion, layout/gallery/animation packages, and browser type declarations.
- [x] 4.2 Verify the Vite production build and manually exercise the existing image-list and full-image browser workflows against the upgraded API.
- [x] 4.3 Upgrade and adapt BullMQ, Threads, Sharp, Sharp Vibrant, EXIF parsing, and thumbnail-worker code; rebuild native modules on the pinned Node runtime.
- [x] 4.4 Verify thumbnail creation and queue processing with Redis and representative image files, including worker startup and error reporting.

## 5. Modernize execution images and development services

- [x] 5.1 Align all Node stages in the API, web, and database Dockerfiles with the pinned Node Current release, use a Sharp-compatible base variant, and preserve existing build outputs and entrypoints unless a migration requires an equivalent replacement.
- [x] 5.2 Update global Turbo installation/build invocation and Prisma generation in Dockerfiles to their current compatible forms; build each image from a clean context.
- [x] 5.3 Upgrade PostgreSQL and Redis image tags in `compose-dev.yaml` to tested supported releases while preserving service names, ports, credentials, volume behavior, and connection URLs.
- [x] 5.4 Start the updated Compose services with disposable data and confirm API/database/Redis connectivity plus thumbnail-job processing.

## 6. Complete compatibility verification and handoff

- [x] 6.1 Run the complete clean-install, Prisma-generation, lint, workspace-build, and Docker-image build matrix on the pinned Node/npm toolchain.
- [x] 6.2 Run API, web, worker, and Compose smoke checks; capture exact commands, selected versions, and results, and resolve all upgrade-induced failures.
- [x] 6.3 Inspect deployment configuration and establish whether it honors the new Node/npm image policy before publishing; document any out-of-repository deployment action without modifying it.
- [x] 6.4 Review the final diff to confirm no secrets, destructive migration changes, unintended public-contract changes, or unrelated user work were introduced.
