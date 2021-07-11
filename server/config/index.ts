import { resolve } from 'path';

export * from './enviroments';

const pwd = process.env.PWD as string;

export const dbPath = resolve(pwd, 'cache/db');
export const previewPath = resolve(pwd, 'cache/preview');

