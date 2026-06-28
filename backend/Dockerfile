# ── Build stage ──────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
# npm ci uses the lockfile exactly — reproducible builds, faster in CI.
RUN npm ci
COPY src ./src
COPY db ./db
RUN npm run build
# Compile db/ scripts (migrate.ts, seeds/run.ts) alongside src/ so the
# production image can run migrations without needing ts-node installed.
RUN npx tsc db/migrate.ts db/seeds/run.ts --outDir dist/db --target ES2022 --module commonjs --esModuleInterop --skipLibCheck --resolveJsonModule

# ── Production stage ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY db/migrations ./db/migrations
EXPOSE 4000
# Run as the built-in non-root node user — never run production containers as root.
USER node
CMD ["node", "dist/index.js"]
