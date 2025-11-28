FROM node:18

WORKDIR /app

# Install dependencies first
COPY package*.json ./
COPY prisma ./prisma      #  🔥 Now Prisma schema exists BEFORE install
RUN npm install

# Copy full project
COPY . .

# Build TypeScript, then generate Prisma Client
RUN npm run build

EXPOSE 1000

# On container start → run migrations, then start server
CMD ["sh", "-c", "npm run migrate && node dist/server.js"]
