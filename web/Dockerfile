# Multi-stage build: install once, optionally test, build, then serve with nginx.
#   docker build --target test web/    # type-check + unit tests
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS test
COPY . .
RUN npm run typecheck && npm test

FROM deps AS build
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
