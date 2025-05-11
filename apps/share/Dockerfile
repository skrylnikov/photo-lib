FROM ubuntu:noble-20250404 AS base

RUN apt-get update && apt-get install -y curl unzip nodejs

ENV BUN_INSTALL="$HOME/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

RUN curl -fsSL https://bun.sh/install | bash && \
    bun i -g turbo prisma

FROM base AS builder
WORKDIR /app
COPY . .
RUN turbo prune --scope=@pl/share --docker

FROM base AS installer
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/bun.lock ./.lock
RUN bun i

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

ARG DATABASE_URL="postgresql://postgres:devpass@db:5432/postgres?schema=public"
ENV DATABASE_URL=$DATABASE_URL

RUN prisma generate

FROM installer AS runner
WORKDIR /app

COPY --from=installer /app .

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

EXPOSE 4001

WORKDIR /app/apps/share

CMD ["bun", "start"]
