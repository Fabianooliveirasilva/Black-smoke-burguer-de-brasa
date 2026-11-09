import { migrateTestDb, resetTestDb } from "./db";

migrateTestDb();
resetTestDb().then(
  () => console.log("test db reset"),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
