FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY services/aura-assist/ ./services/aura-assist/

RUN npm install
RUN npm run build --workspaces

FROM node:20-alpine AS runner

WORKDIR /app

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/services/aura-assist ./services/aura-assist

WORKDIR /app/services/aura-assist
EXPOSE 3011

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD wget -qO- http://127.0.0.1:3011/health || exit 1

USER node

CMD ["npm", "start"]
