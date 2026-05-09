import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const queryClient = postgres(url, {
  max: 10,
  prepare: false,
});

export const db = drizzle(queryClient, { schema, logger: process.env.DB_LOG === '1' });
export * from './schema.js';
export { schema };
