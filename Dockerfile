FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/platform-cache/package.json ./packages/platform-cache/package.json
COPY packages/platform-db/package.json ./packages/platform-db/package.json
RUN npm ci

COPY . .
RUN npm run db:generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
