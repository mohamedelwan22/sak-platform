FROM node:20-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Prisma generate only needs a syntactically valid URL here.
# The real DATABASE_URL is supplied by Railway at runtime.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

RUN npm run build


FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/prisma ./prisma

# Required by Prisma CLI for migrate deploy/status
COPY --from=base /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3001

CMD ["npm", "start"]