# syntax=docker/dockerfile:1
# Multi-arch (linux/amd64, linux/arm64) production image for skill-tracker.
# Build:  docker buildx build --platform linux/arm64,linux/amd64 -t ghcr.io/bittricky/skill-tracker .
# Run:    docker run --rm -p 3000:3000 ghcr.io/bittricky/skill-tracker

ARG NODE_IMAGE=node:22-alpine
ARG PNPM_VERSION=10.34.5

FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# ---- dev dependencies (also used by docker-compose `dev` target) ----
FROM base AS development-dependencies-env
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .

# ---- production dependencies ----
FROM base AS production-dependencies-env
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# ---- build ----
FROM development-dependencies-env AS build-env
RUN pnpm run build

# ---- runtime ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
WORKDIR /app
COPY package.json ./
COPY --from=production-dependencies-env /app/node_modules ./node_modules
COPY --from=build-env /app/build ./build
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "node_modules/@react-router/serve/bin.js", "./build/server/index.js"]
