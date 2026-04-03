FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types ./packages/shared-types
COPY packages/db ./packages/db
COPY packages/gemini-client ./packages/gemini-client
COPY services/civic-pulse ./services/civic-pulse

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nexus-civic/shared-types build
RUN pnpm --filter @nexus-civic/db build
RUN pnpm --filter @nexus-civic/gemini-client build
RUN pnpm --filter @nexus-civic/civic-pulse build

FROM node:20-alpine AS runner

WORKDIR /app
RUN npm install -g pnpm

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml  ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/civic-pulse/package.json ./services/civic-pulse/
COPY --from=builder /app/services/civic-pulse/dist ./services/civic-pulse/dist
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

CMD ["node", "services/civic-pulse/dist/index.js"]
