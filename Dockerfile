FROM node:18

WORKDIR /app

# Copy only package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma folder early (allowed)
COPY prisma ./prisma

# Copy the entire project AFTER install
COPY . .

# Generate Prisma client and build TS
RUN npx prisma generate
RUN npm run build

EXPOSE 1000

# Start: run migrations → launch server
CMD ["sh", "-c", "npm run migrate && node dist/server.js"]
