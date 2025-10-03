import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  PORT: process.env.PORT, // optional fallback
  DB_USERNAME: requireEnv('DB_USERNAME'),
  DB_PASSWORD: requireEnv('DB_PASSWORD'),
  DB_HOST: requireEnv('DB_HOST'),
  DB_PORT: process.env.DB_PORT || '5432', // optional fallback
  DB_NAME: requireEnv('DB_NAME'),
  JWT_SECRET: requireEnv('JWT_SECRET'),

  // Cloudinary config
  CLOUDINARY_CLOUD_NAME: requireEnv('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: requireEnv('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: requireEnv('CLOUDINARY_API_SECRET'),
};
