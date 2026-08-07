FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy backend source including Prisma schema
COPY . .

# Generate Prisma Client BEFORE TypeScript compilation
RUN npx prisma generate

# Build TypeScript
RUN npm run build


FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

# Prisma generated client/runtime may be needed at runtime
COPY --from=base /app/prisma ./prisma

EXPOSE 3001

CMD ["npm", "start"]