# syntax=docker/dockerfile:1

# ---- deps: install all packages from the lockfile ----
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile the Next.js standalone server ----
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# All site configuration (sheet ID, email and Stripe keys) is read at runtime
# from the Cloud Run service's environment, so the image needs no build args.
RUN npm run build

# ---- runtime: minimal image with only the standalone output ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 8080
CMD ["node", "server.js"]
