import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Commands run from the repo root (pnpm db:*), so cwd is shared/db → the root .env is two up.
config({ path: ["../../.env", ".env"] });

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env at the repo root: cp .env.example .env",
  );
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
