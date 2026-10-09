import { config } from 'dotenv';
import { z } from 'zod';

// Loads apps/api/.env if present, else the repo-root .env.
config({ path: ['.env', '../../.env'] });

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.url(),
  // Secure cookies need TLS; a plain-HTTP browser drops them and every request looks new.
  COOKIE_SECURE: z.stringbool().default(isProduction),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment:\n${z.prettifyError(parsed.error)}\n` +
      'Copy .env.example to .env at the repo root: cp .env.example .env',
  );
}

export const env = parsed.data;
