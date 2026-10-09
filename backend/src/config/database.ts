import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.info('PostgreSQL connected through Prisma');
  } catch (error) {
    console.error('PostgreSQL connection failed', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.info('PostgreSQL disconnected');
}
