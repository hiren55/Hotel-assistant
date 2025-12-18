import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
  console.log('Test database connected');
});

afterAll(async () => {
  // Disconnect from test database
  await prisma.$disconnect();
  console.log('Test database disconnected');
});

// Global test utilities
export { prisma };
