import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../src/generated/prisma/client";
import { alwaysOpenHours, categories, coupons, openingHours, store, zones } from "./seed-data";

export interface SeedOptions {
  admin?: { email: string; password: string; name: string };
  /** Test/CI environments open the store all day so tests do not depend on the clock. */
  alwaysOpen?: boolean;
}

/** Idempotent seed: safe to run repeatedly. */
export async function seed(prisma: PrismaClient, opts: SeedOptions = {}) {
  const hours = opts.alwaysOpen ? alwaysOpenHours : openingHours;
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: { openingHours: hours },
    create: { id: 1, ...store, openingHours: hours },
  });

  for (const [i, z] of zones.entries()) {
    const existing = await prisma.deliveryZone.findFirst({ where: { name: z.name } });
    if (existing) await prisma.deliveryZone.update({ where: { id: existing.id }, data: { ...z, sortOrder: i } });
    else await prisma.deliveryZone.create({ data: { ...z, sortOrder: i } });
  }

  for (const [ci, c] of categories.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: ci },
      create: { slug: c.slug, name: c.name, sortOrder: ci },
    });
    for (const [pi, p] of c.products.entries()) {
      const data = {
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        priceCents: p.priceCents,
        imageUrl: p.image,
        categoryId: category.id,
        isPopular: p.isPopular ?? false,
        allowsDoneness: p.allowsDoneness ?? false,
        sortOrder: pi,
      };
      const exists = await prisma.product.findUnique({ where: { slug: p.slug } });
      if (exists) continue; // never overwrite admin edits
      await prisma.product.create({
        data: {
          slug: p.slug,
          ...data,
          ingredients: { create: p.ingredients.map(([name, removable], sortOrder) => ({ name, removable, sortOrder })) },
          options: { create: p.options.map(([name, priceCents, maxQuantity], sortOrder) => ({ name, priceCents, maxQuantity, sortOrder })) },
        },
      });
    }
  }

  for (const c of coupons) {
    await prisma.coupon.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  if (opts.admin) {
    const email = opts.admin.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const id = randomUUID();
      await prisma.user.create({
        data: {
          id,
          email,
          name: opts.admin.name,
          role: "admin",
          emailVerified: true,
          accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(opts.admin.password) } },
        },
      });
    } else if (user.role !== "admin") {
      await prisma.user.update({ where: { id: user.id }, data: { role: "admin" } });
    }
  }
}
