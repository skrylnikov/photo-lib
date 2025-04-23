FROM ubuntu:noble-20250404 AS base

RUN apt-get update && apt-get install -y curl unzip

ENV BUN_INSTALL="$HOME/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

RUN curl -fsSL https://bun.sh/install | bash && \
    bun i -g turbo@1 prisma

FROM base AS builder
WORKDIR /app
COPY . .
RUN turbo prune --scope=@pl/thumbnail --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
WORKDIR /app

RUN apt-get update && apt-get install -y \
pkg-config software-properties-common \
add-apt-repository -y ppa:ubuntuhandbook1/libheif \
libvips-dev \
libheif-dev \
libheif1 \
heif-thumbnailer \
libheif-plugin-libde265 \
libheif-plugin-x265 \
libheif-plugin-aomdec \
libheif-plugin-aomenc \
libheif-plugin-dav1d


# First install dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN bun i

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
# COPY .env .env

ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
 
ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

ARG DATABASE_URL="postgresql://postgres:devpass@db:5432/postgres?schema=public"
# ENV DATABASE_URL=$DATABASE_URL

# RUN turbo run build --filter=@pl/thumbnail
RUN prisma generate

FROM installer AS runner


WORKDIR /app

COPY --from=installer /app/services/thumbnail/package.json .
COPY --from=installer /app .

# RUN npm prune sharp
# RUN npm install --verbose --no-cache sharp@0.31.3
# Don't run production as root
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nodejs
# USER nodejs

# EXPOSE 4001

CMD ["bun", "start"]
