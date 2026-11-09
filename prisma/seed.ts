import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seed } from "./seed-lib";

const prod = process.env.NODE_ENV === "production";
const email = process.env.SEED_ADMIN_EMAIL ?? (prod ? undefined : "admin@blacksmoke.dev");
const password = process.env.SEED_ADMIN_PASSWORD ?? (prod ? undefined : "BlackSmoke#2026");
if (prod && (!email || !password || password.length < 12)) {
  console.error("Production seed requires SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 12 chars).");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
seed(prisma, {
  admin: email && password ? { email, password, name: "Administrador" } : undefined,
  alwaysOpen: process.env.SEED_ALWAYS_OPEN === "true",
})
  .then(() => console.log("Seed complete"))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
