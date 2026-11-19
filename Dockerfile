FROM node:20-alpine

# Time zone data, so times in messages and menu changes follow Indian time
RUN apk add --no-cache tzdata
ENV NODE_ENV=production \
    TZ=Asia/Kolkata \
    PORT=3000

WORKDIR /app/server

# Install dependencies first so Docker can cache this layer
COPY server/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
 && npm cache clean --force

# The server serves ../client, so both folders go side by side
COPY server/ ./
COPY client/ /app/client/

# Dish photos are saved here (mounted as a volume in docker-compose.yml)
RUN mkdir -p /app/server/uploads && chown -R node:node /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/api/menu >/dev/null || exit 1

CMD ["node", "server.js"]