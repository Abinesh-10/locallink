# ── Build stage ──────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
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
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY db/migrations ./db/migrations
EXPOSE 4000
CMD ["node", "dist/index.js"]
