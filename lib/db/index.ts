import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL tanımlanmadı.");
}

const isLocalDatabase = /(?:localhost|127\.0\.0\.1|postgres)(?::|\/)/i.test(connectionString);
const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  ssl: isLocalDatabase ? undefined : { rejectUnauthorized: false },
});
export const db = drizzle({ client: pool, schema });
