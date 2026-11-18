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

# NEXT_PUBLIC_* values are inlined into the bundle at build time (and the
# /privacy page is prerendered), so they must be supplied here, not only at runtime.
ARG NEXT_PUBLIC_CONTACT_EMAIL=""
ARG NEXT_PUBLIC_PAYPAL_DONATION_URL=""
ENV NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_PAYPAL_DONATION_URL=$NEXT_PUBLIC_PAYPAL_DONATION_URL \
    NEXT_TELEMETRY_DISABLED=1

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
