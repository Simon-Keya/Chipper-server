import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';

// Global test configuration
jest.setTimeout(30000); // 30 seconds timeout for tests

// Create a deep mock of the PrismaClient
jest.mock('../src/utils/prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

// Export the mock so it can be used in test files
export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});