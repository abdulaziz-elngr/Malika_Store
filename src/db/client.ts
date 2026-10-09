import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

/**
 * Production: set DATABASE_URL to a PostgreSQL connection string.
 * Local development without Postgres: falls back to an embedded PostgreSQL (PGlite) stored in .data/pglite.
 */
function create() {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    // An idle client erroring (e.g. the database restarted) must not crash the whole process.
    pool.on("error", (err) => console.error("[db] idle client error:", err.message));
    return { kind: "pg" as const, db: drizzlePg(pool, { schema }) };
  }
  // The embedded database lives on local disk and is for development only.
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && process.env.ALLOW_EMBEDDED_DB !== "1") {
    throw new Error("DATABASE_URL is required in production: the embedded development database is not allowed (set ALLOW_EMBEDDED_DB=1 only to try a production build locally).");
  }
  const dir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  return { kind: "pglite" as const, db: drizzlePglite(client, { schema }) };
}

const g = globalThis as unknown as { __malikaDb?: ReturnType<typeof create> };
export const database = (g.__malikaDb ??= create());
export const db = database.db as ReturnType<typeof drizzlePg<typeof schema>>;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** Either the shared client or an open transaction, so services can run inside either. */
export type Executor = typeof db | Tx;
