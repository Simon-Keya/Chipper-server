FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate prisma client during build only
RUN npx prisma generate

# The migration will run only after environment variables exist
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
EXPOSE 4000
