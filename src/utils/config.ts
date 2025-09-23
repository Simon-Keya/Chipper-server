import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || '5000',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_here',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
};