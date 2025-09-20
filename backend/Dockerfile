# ---- Base Stage ----
FROM node:20-alpine AS base
WORKDIR /usr/src/app
RUN npm install -g pnpm

# ---- Dependencies Stage ----
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# ---- Build Stage ----
FROM base AS builder
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN pnpm prisma:gen
RUN pnpm build

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV production

# Copy production dependencies and built source from previous stages
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package.json ./package.json

# Expose port and define command
EXPOSE 8080
CMD ["node", "dist/main"]