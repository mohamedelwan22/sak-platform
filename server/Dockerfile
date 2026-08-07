# FROM node:20-alpine AS base

# WORKDIR /app

# COPY package.json bun.lock* ./
# RUN corepack enable && corepack prepare bun@latest --activate
# RUN bun install --frozen-lockfile

# COPY . .
# RUN bun run build

# FROM node:20-alpine AS production

# WORKDIR /app

# COPY --from=base /app/dist ./dist
# COPY --from=base /app/node_modules ./node_modules
# COPY --from=base /app/package.json ./

# ENV NODE_ENV=production
# EXPOSE 3001

# CMD ["node", "dist/server.js"]

FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies using npm
COPY package.json package-lock.json ./
RUN npm ci

# Copy backend source
COPY . .

# Build TypeScript
RUN npm run build


FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy built application and installed dependencies
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

EXPOSE 3001

CMD ["npm", "start"]