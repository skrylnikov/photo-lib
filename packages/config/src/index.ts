import { env } from 'node:process';
import { config } from 'dotenv';

config({
  path: '../../.env',
});

export const storagePath = env.STORAGE_PATH || '';
export const cachePath = env.CACHE_PATH || '';
export const tgBotToken = env.TG_BOT_TOKEN || '';

export const redis = {
  host: env.REDIS_HOST || 'localhost',
  port: Number.parseInt(env.REDDIS_POST || '0', 10) || 6379,
};

export const s3 = {
  accessKeyId: env.S3_ACCESS_KEY_ID || '',
  secretAccessKey: env.S3_SECRET_ACCESS_KEY || '',
  bucket: env.S3_BUCKET || '',
  endpoint: env.S3_ENDPOINT || '',
}

