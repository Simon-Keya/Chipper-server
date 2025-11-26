FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate prisma client during build
RUN npx prisma generate

# Build TypeScript to dist/
RUN npm run build

# Run migrations only after env vars exist
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

EXPOSE 1000
