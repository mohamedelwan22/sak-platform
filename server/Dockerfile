FROM node:20-alpine AS base

WORKDIR /app

COPY package.json bun.lock* ./
RUN corepack enable && corepack prepare bun@latest --activate
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/server.js"]
