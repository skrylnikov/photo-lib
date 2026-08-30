FROM node:24.13.0-bookworm-slim AS build

WORKDIR /app
RUN apt-get update \
  && apt-get install --no-install-recommends --yes python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY . .
RUN npm install --global pnpm@12.0.0-rc.8 turbo@2.10.10
RUN pnpm install --frozen-lockfile
RUN pnpm --filter share-web build

FROM ghcr.io/umputun/reproxy
COPY --from=build /app/apps/share-web/src/dist /srv/site
EXPOSE 8080
USER app
ENTRYPOINT ["/srv/reproxy", "--assets.location=/srv/site", "--assets.spa"]
