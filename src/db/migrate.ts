import path from "node:path";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { database } from "./client";

export async function runMigrations() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (database.kind === "pg") await migratePg(database.db as never, { migrationsFolder });
  else await migratePglite(database.db as never, { migrationsFolder });
}
