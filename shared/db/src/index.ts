import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

export * from "./schema.js";

export function createDb(url: string) {
  return drizzle(url, { schema });
}

// Inferred, not annotated: naming the return type would drop `$client`, which shutdown needs.
export type Db = ReturnType<typeof createDb>;
