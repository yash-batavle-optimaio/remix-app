FROM node:18-alpine

# Needed for Prisma + SSL Postgres
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force
# Optional: remove Shopify CLI in production
RUN npm remove @shopify/cli

COPY . .

RUN npm run build

# Add entrypoint for runtime migrations
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
