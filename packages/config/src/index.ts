import { env } from 'node:process';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const numberFromEnv = (name: string, fallback: number): number => {
  const value = Number.parseInt(env[name] ?? '', 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const listFromEnv = (name: string): string[] =>
  (env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const databaseUrl = env.DATABASE_URL ?? 'file:./data/photo-library.db';
const databasePath = databaseUrl.startsWith('file:')
  ? resolve(process.cwd(), databaseUrl.slice('file:'.length))
  : resolve(process.cwd(), env.SQLITE_DB_PATH ?? 'data/photo-library.db');

export const appConfig = {
  nodeEnv: env.NODE_ENV ?? 'development',
  port: numberFromEnv('PORT', 4001),
  databaseUrl,
  databasePath,
  sqliteBusyTimeoutMs: numberFromEnv('SQLITE_BUSY_TIMEOUT_MS', 5000),
  rustfs: {
    endpoint: env.RUSTFS_ENDPOINT ?? 'http://localhost:9000/photo-library',
    publicEndpoint: env.RUSTFS_PUBLIC_ENDPOINT ?? env.RUSTFS_ENDPOINT ?? 'http://localhost:9000/photo-library',
    region: env.RUSTFS_REGION ?? 'us-east-1',
    bucket: env.RUSTFS_BUCKET ?? 'photo-library',
    accessKeyId: env.RUSTFS_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.RUSTFS_SECRET_ACCESS_KEY ?? '',
    presignSeconds: numberFromEnv('RUSTFS_PRESIGN_SECONDS', 300),
  },
  cache: {
    path: resolve(process.cwd(), env.DERIVATIVE_CACHE_PATH ?? 'data/cache'),
    maxBytes: numberFromEnv('DERIVATIVE_CACHE_MAX_BYTES', 2 * 1024 * 1024 * 1024),
    highWaterBytes: numberFromEnv('DERIVATIVE_CACHE_HIGH_WATER_BYTES', 2.25 * 1024 * 1024 * 1024),
    targetBytes: numberFromEnv('DERIVATIVE_CACHE_TARGET_BYTES', 1.75 * 1024 * 1024 * 1024),
  },
  tmpPath: resolve(process.cwd(), env.MEDIA_TMP_PATH ?? 'data/tmp'),
  media: {
    maxBytes: numberFromEnv('MEDIA_MAX_BYTES', 100 * 1024 * 1024),
    maxPixels: numberFromEnv('MEDIA_MAX_PIXELS', 100_000_000),
    maxAttempts: numberFromEnv('MEDIA_MAX_ATTEMPTS', 3),
    leaseSeconds: numberFromEnv('MEDIA_JOB_LEASE_SECONDS', 120),
  },
  oidc: {
    issuer: env.OIDC_ISSUER ?? '',
    clientId: env.OIDC_CLIENT_ID ?? '',
    clientSecret: env.OIDC_CLIENT_SECRET ?? '',
    redirectUri: env.OIDC_REDIRECT_URI ?? 'http://localhost:4000/auth/callback',
    allowedSubjects: listFromEnv('OIDC_ALLOWED_SUBJECTS'),
    allowedGroups: listFromEnv('OIDC_ALLOWED_GROUPS'),
    sessionLifetimeSeconds: numberFromEnv('OIDC_SESSION_LIFETIME_SECONDS', 8 * 60 * 60),
    cookieName: env.OIDC_COOKIE_NAME ?? 'photo_library_session',
    cookieSecure: (env.OIDC_COOKIE_SECURE ?? 'true') !== 'false',
  },
} as const;

export type AppConfig = typeof appConfig;
