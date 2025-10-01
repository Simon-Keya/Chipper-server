import prisma from '../utils/prisma';

export const initializeDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', (error as Error).message);
    throw error;
  }
};
