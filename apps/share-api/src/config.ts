// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import dotenv from 'dotenv';

dotenv.config();

export const storagePath = process.env.STORAGE_PATH as string;
