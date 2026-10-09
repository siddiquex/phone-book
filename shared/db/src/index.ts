import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

export type Db = NodePgDatabase;

export function createDb(url: string): Db {
  return drizzle(url);
}
