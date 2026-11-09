/**
 * Local PostgreSQL without Docker (dev/test convenience).
 * Uses real PostgreSQL 17 binaries via `embedded-postgres`.
 *   pnpm db:start   -> starts cluster in ./.pgdata on port 5433 (foreground)
 * In Docker/CI, use the `postgres` service instead (see docker-compose.yml).
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.env.PGDATA_DIR ?? ".pgdata");
const port = Number(process.env.PGPORT ?? 5433);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "burger",
  password: "burger_dev_password",
  port,
  persistent: true,
  onLog: () => {},
});

async function main() {
  const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) {
    await pg.createDatabase("blacksmoke");
    await pg.createDatabase("blacksmoke_test");
  }
  console.log(`PostgreSQL ready on postgresql://burger:***@localhost:${port}`);
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch(async (err) => {
  console.error(err);
  await pg.stop().catch(() => {});
  process.exit(1);
});
