FROM node:18

WORKDIR /app

# Install dependencies first (cache-friendly)
COPY package*.json ./

# Copy Prisma before install so `prisma generate` works later
COPY prisma ./prisma

RUN npm install

# Copy full project
COPY . .

# Build TypeScript and generate Prisma client
RUN npm run build
RUN npx prisma generate

EXPOSE 1000

# When container starts → apply migrations then start server
CMD ["sh", "-c", "npm run migrate && node dist/server.js"]
