FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g turbo

COPY package.json package-lock.json turbo.json ./
COPY packages/ ./packages/
COPY services/gig-forge/ ./services/gig-forge/

RUN npm ci

WORKDIR /app/services/gig-forge
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/gig-forge/package.json ./services/gig-forge/
COPY --from=builder /app/services/gig-forge/dist ./services/gig-forge/dist

WORKDIR /app/services/gig-forge
EXPOSE 3004

CMD ["npm", "start"]
