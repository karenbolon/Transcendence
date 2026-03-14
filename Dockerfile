FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# Prune dev dependencies but keep drizzle-kit for runtime migrations
RUN npm prune --omit=dev && npm install drizzle-kit

FROM node:22-alpine

WORKDIR /app

# Copy production node_modules
COPY --from=build /app/node_modules ./node_modules

# Copy built SvelteKit app and custom server
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --from=build /app/server.js ./

# Copy drizzle migrations and config for runtime migration
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./

# Copy the schema source (needed by drizzle.config.ts reference)
COPY --from=build /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts
COPY --from=build /app/src/db/schema ./src/db/schema

# Copy entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
