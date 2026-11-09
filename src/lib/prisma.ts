import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

const g = globalThis as unknown as { prisma?: PrismaClient };

function client(): PrismaClient {
  g.prisma ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: env().DATABASE_URL }) });
  return g.prisma;
}

/** Lazily-connected singleton: importing this module never requires env vars. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const c = client();
    const value = Reflect.get(c, prop);
    return typeof value === "function" ? value.bind(c) : value;
  },
  has: (_t, prop) => Reflect.has(client(), prop),
});
