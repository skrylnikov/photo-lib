import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../prisma/generated/client/index.js';
import { appConfig } from 'config';

declare global {
  var prisma: PrismaClient | undefined;
}

const adapter = new PrismaBetterSqlite3({
  url: appConfig.databaseUrl,
  timeout: appConfig.sqliteBusyTimeoutMs,
});

export const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export const configureSqlite = async (): Promise<void> => {
  await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL');
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  await prisma.$executeRawUnsafe(
    `PRAGMA busy_timeout = ${String(Math.trunc(appConfig.sqliteBusyTimeoutMs))}`,
  );
};

export * from '../prisma/generated/client/index.js';
