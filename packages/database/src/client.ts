/* eslint-disable */
import { PrismaClient } from "./__generated__";

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

export * from "./__generated__";

/* eslint-enable */
