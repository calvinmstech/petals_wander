# Development image for the Next.js storefront + admin app.
# (For production you'd add a multi-stage `next build` + `next start` target.)
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm install

# App source (bind-mounted over this in dev via docker-compose)
COPY . .

EXPOSE 3000

# Bind to 0.0.0.0 so the dev server is reachable through the published port
CMD ["npx", "next", "dev", "-H", "0.0.0.0", "-p", "3000"]
