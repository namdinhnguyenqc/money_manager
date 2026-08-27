# Debian slim rather than Alpine: bcrypt has no musl prebuild and would have to
# compile from source, which needs python3/make/g++ that this image does not
# carry. sharp and bcrypt both ship glibc prebuilds, so slim installs cleanly.
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
# backend/ has no package-lock.json (lockfile lives at the monorepo root), so
# `npm ci` fails here. Use `npm install` which resolves from package.json alone.
RUN npm install

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/assets ./assets
EXPOSE 8787
CMD ["npm", "start"]
