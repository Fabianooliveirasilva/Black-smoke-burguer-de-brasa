import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { seed } from "../../prisma/seed-lib";
import { ADMIN, TEST_DATABASE_URL } from "./test-env";

export function migrateTestDb() {
  execSync("pnpm exec prisma migrate deploy", { env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }, stdio: "pipe" });
}

/** Truncates every table and re-seeds a deterministic, always-open store. */
export async function resetTestDb() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
    await seed(prisma, { alwaysOpen: true, admin: { ...ADMIN, name: "Admin Teste" } });
  } finally {
    await prisma.$disconnect();
  }
}
