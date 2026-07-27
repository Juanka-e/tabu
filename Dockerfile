FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/domain-game/package.json ./packages/domain-game/package.json
COPY packages/platform-cache/package.json ./packages/platform-cache/package.json
COPY packages/platform-db/package.json ./packages/platform-db/package.json
RUN npm ci

COPY . .
RUN SKIP_DATABASE_DURING_BUILD=true npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
