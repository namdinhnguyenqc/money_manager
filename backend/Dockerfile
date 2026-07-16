FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# backend/ has no package-lock.json (lockfile lives at the monorepo root), so
# `npm ci` fails here. Use `npm install` which resolves from package.json alone.
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 8787
CMD ["npm", "start"]
