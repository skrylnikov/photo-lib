import 'dotenv/config';

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'packages/database/prisma/schema.prisma',
  migrations: {
    path: 'packages/database/prisma/migrations-sqlite',
  },
  datasource: {
    url:
      process.env.DATABASE_URL ?? 'file:./data/photo-library.db',
  },
});
