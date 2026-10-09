import { runMigrations } from "../src/db/migrate";

runMigrations().then(() => {
  console.log("Migrations applied.");
  process.exit(0);
});
