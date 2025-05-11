FROM ubuntu:noble-20250404 AS base

RUN apt-get update && apt-get install -y curl unzip nodejs adduser

ENV BUN_INSTALL="$HOME/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

RUN curl -fsSL https://bun.sh/install | bash && \
    bun i -g turbo prisma

FROM base AS builder
WORKDIR /app
COPY . .
RUN turbo prune --scope=@pl/share-bot --docker

FROM base AS installer
WORKDIR /app

# RUN apt-get update && apt-get install -y \
#     pkg-config software-properties-common && \
#     add-apt-repository -y ppa:ubuntuhandbook1/libheif && \
#     apt-get install -y \
#     libvips-dev \
#     libheif-dev \
#     libheif1 \
#     heif-thumbnailer \
#     libheif-plugin-libde265 \
#     libheif-plugin-x265 \
#     libheif-plugin-aomdec \
#     libheif-plugin-aomenc \
#     libheif-plugin-dav1d

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

WORKDIR /app/services/share-bot

CMD ["bun", "start"]
