import { env } from 'node:process';
import { config } from 'dotenv';

config({
  path: '../../.env',
});

export const storagePath = env.STORAGE_PATH || '';
export const cachePath = env.CACHE_PATH || '';
export const tgBotToken = env.TG_BOT_TOKEN || '';

export const reddis = {
  host: env.REDDIS_HOST || 'localhost',
  port: Number.parseInt(env.REDDIS_POST || '0', 10) || 6379,
};
