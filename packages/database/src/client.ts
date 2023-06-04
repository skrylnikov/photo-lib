/* eslint-disable */
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:devpass@localhost:5432/postgres?schema=public',
    }
  }
});

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export * from "@prisma/client";

/* eslint-enable */
