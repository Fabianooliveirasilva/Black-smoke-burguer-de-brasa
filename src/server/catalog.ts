import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { PricingProduct } from "./pricing";

export const MENU_TAG = "menu";

const productInclude = {
  ingredients: { orderBy: { sortOrder: "asc" as const }, select: { id: true, name: true, removable: true } },
  options: {
    where: { active: true },
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, name: true, priceCents: true, maxQuantity: true },
  },
  category: { select: { slug: true, name: true } },
};

/** Public menu. Cached in-process; callers must be request-time (after `connection()`). */
export async function getMenu() {
  "use cache";
  cacheLife("minutes");
  cacheTag(MENU_TAG);
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: productInclude,
      },
    },
  });
  return categories.filter((c) => c.products.length > 0);
}

export type MenuCategory = Awaited<ReturnType<typeof getMenu>>[number];
export type MenuProduct = MenuCategory["products"][number];

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(MENU_TAG);
  return prisma.product.findFirst({ where: { slug, deletedAt: null, category: { active: true } }, include: productInclude });
}

/** Fresh (uncached) read used when pricing an order. */
export async function loadPricingProducts(ids: string[]): Promise<Map<string, PricingProduct>> {
  const rows = await prisma.product.findMany({
    where: { id: { in: [...new Set(ids)] }, deletedAt: null, category: { active: true } },
    include: { ingredients: true, options: true },
  });
  return new Map(rows.map((p) => [p.id, p]));
}
