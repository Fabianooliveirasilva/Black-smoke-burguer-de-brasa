import { migrateTestDb, resetTestDb } from "./db";

export default async function setup() {
  migrateTestDb();
  await resetTestDb();
}
