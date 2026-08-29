FROM node:24.13.0-bookworm-slim AS build

RUN apt-get update \
  && apt-get install --no-install-recommends --yes ca-certificates git build-essential cmake meson ninja-build pkg-config openssl libglib2.0-dev libexpat1-dev libfftw3-dev libheif-dev libjxl-dev libde265-dev libx265-dev libaom-dev libwebp-dev libjpeg-dev libpng-dev libtiff-dev liblcms2-dev \
  && rm -rf /var/lib/apt/lists/*

ARG LIBHEIF_VERSION=1.23.1
RUN git clone --depth 1 --branch v${LIBHEIF_VERSION} https://github.com/strukturag/libheif.git /tmp/libheif \
  && cmake -S /tmp/libheif -B /tmp/libheif/build -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local -DENABLE_PLUGIN_LOADING=OFF -DWITH_LIBDE265=ON -DWITH_X265=ON -DWITH_AOM_ENCODER=ON -DWITH_AOM_DECODER=ON \
  && cmake --build /tmp/libheif/build \
  && cmake --install /tmp/libheif/build \
  && ldconfig

ARG LIBVIPS_VERSION=8.18.3
COPY apps/share-api/patches/libvips-heif-x265-speed.patch /tmp/libvips-heif-x265-speed.patch
COPY apps/share-api/patches/libvips-8.18.3-heif-max-items.patch /tmp/libvips-8.18.3-heif-max-items.patch
RUN git clone --depth 1 --branch v${LIBVIPS_VERSION} https://github.com/libvips/libvips.git /tmp/libvips \
  && git -C /tmp/libvips apply --check /tmp/libvips-8.18.3-heif-max-items.patch \
  && git -C /tmp/libvips apply /tmp/libvips-8.18.3-heif-max-items.patch \
  && git -C /tmp/libvips apply /tmp/libvips-heif-x265-speed.patch \
  && meson setup /tmp/libvips/build /tmp/libvips --prefix=/usr/local -Dintrospection=disabled \
  && meson compile -C /tmp/libvips/build \
  && meson install -C /tmp/libvips/build \
  && printf '/usr/local/lib\n/usr/local/lib/%s\n' "$(dpkg-architecture -qDEB_HOST_MULTIARCH)" > /etc/ld.so.conf.d/photo-library-local.conf \
  && ldconfig
WORKDIR /app
ENV SHARP_FORCE_GLOBAL_LIBVIPS=1
ENV LD_LIBRARY_PATH=/usr/local/lib/aarch64-linux-gnu:/usr/local/lib
ENV npm_config_nodedir=/usr/local
RUN npm install --global pnpm@12.0.0-rc.8
COPY . .
RUN pnpm install --frozen-lockfile
RUN SHARP_DIR="$(find node_modules/.pnpm -maxdepth 1 -type d -name 'sharp@*')" \
  && [ "$(find node_modules/.pnpm -maxdepth 1 -type d -name 'sharp@*' | wc -l)" = "1" ] \
  && cd "$SHARP_DIR/node_modules/sharp" \
  && PATH="/app/node_modules/.bin:$PATH" npm run build
RUN pnpm run generate
RUN pnpm run build
RUN CODEC_PROBE_DEBUG=1 pnpm --filter share-api check:codecs
RUN CUSTOM_MEDIA_RUNTIME=1 pnpm --filter share-api exec tsx --test src/media/custom-runtime.test.ts

FROM node:24.13.0-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install --no-install-recommends --yes openssl libglib2.0-0 libexpat1 libfftw3-double3 libheif1 libhwy1 libjxl0.7 libde265-0 libx265-199 libaom3 libwebp7 libwebpmux3 libwebpdemux2 libjpeg62-turbo libpng16-16 libtiff6 liblcms2-2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV LD_LIBRARY_PATH=/usr/local/lib/aarch64-linux-gnu:/usr/local/lib
COPY --from=build /usr/local /usr/local
RUN npm install --global pnpm@12.0.0-rc.8
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/share-api ./apps/share-api
COPY --from=build /app/packages/config ./packages/config
COPY --from=build /app/packages/database ./packages/database
COPY --from=build /app/packages/tsconfig ./packages/tsconfig
COPY --from=build /app/test-fixtures/heic/tiled-6x8.heic ./test-fixtures/heic/tiled-6x8.heic
COPY --from=build /app/test-fixtures/heic/tiled-17x16-over-budget.heic ./test-fixtures/heic/tiled-17x16-over-budget.heic

RUN printf '/usr/local/lib\n/usr/local/lib/aarch64-linux-gnu\n' > /etc/ld.so.conf.d/photo-library-local.conf \
  && ldconfig
RUN ldconfig
RUN mkdir -p /var/lib/photo-library /app/data/cache /app/data/tmp
EXPOSE 4001
CMD ["sh", "-c", "pnpm --filter database db:migrate:deploy && exec node apps/share-api/dist/index.js"]
