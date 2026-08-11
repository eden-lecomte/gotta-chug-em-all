# syntax=docker/dockerfile:1

# The game is a static bundle, so the toolchain only exists to produce dist/ and
# has no business in the shipped image.
FROM node:22-alpine AS build
WORKDIR /app

# Copied first so a source-only change does not reinstall the dependency tree.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Empty by default, which builds for a site served at the root of its own
# hostname or port. Set it when serving from a subpath:
#   docker compose build --build-arg BASE_PATH=/chug/
ARG BASE_PATH=
ENV BASE_PATH=${BASE_PATH}
RUN npm run build

FROM nginx:1.27-alpine AS serve

# Drops the default server block; ours handles SPA routing and cache headers.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# 127.0.0.1, not localhost: that resolves to ::1 first and the server block
# above listens on IPv4 only, so the check would fail against a working site.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
