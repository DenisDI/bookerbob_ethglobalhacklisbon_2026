# FairTerms monorepo → single Fly process: gateway + built web
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/gateway/package.json apps/gateway/
COPY apps/web/package.json apps/web/
COPY packages/context-bands-mcp/package.json packages/context-bands-mcp/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build -w @fairterms/web

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV GATEWAY_PORT=3000
ENV STATIC_DIR=/app/apps/web/dist
COPY --from=build /app /app
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@fairterms/gateway"]
