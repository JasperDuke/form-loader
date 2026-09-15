FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci --workspace=api --omit=dev

COPY apps/api ./apps/api

WORKDIR /app/apps/api

ENV NODE_ENV=production

EXPOSE 3020

VOLUME ["/app/apps/api/uploads"]

CMD ["node", "src/index.js"]
