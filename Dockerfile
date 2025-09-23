# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and migrations
COPY prisma ./prisma

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Apply migrations
RUN npx prisma migrate deploy

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]