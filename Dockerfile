FROM node:20-alpine

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./

WORKDIR /app
COPY client/ ./client/

WORKDIR /app/server

ENV NODE_ENV=production
EXPOSE 80

CMD ["node", "server.js"]