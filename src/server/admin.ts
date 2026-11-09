import "server-only";
import { revalidateTag } from "next/cache";
import type { z } from "zod";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { HttpError, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import type { adminOrdersQuery } from "@/schemas/order";
import type { categorySchema, couponSchema, deliveryZoneSchema, productSchema, settingsSchema } from "@/schemas/catalog";
import { MENU_TAG } from "./catalog";
import { allowedNextStatuses } from "./order-status";
import { PROMOTIONS_TAG, STORE_TAG } from "./store";

const expire = (...tags: string[]) => tags.forEach((t) => revalidateTag(t, { expire: 0 }));

// ───────────── Products ─────────────

const adminProductInclude = {
  category: { select: { id: true, name: true } },
  ingredients: { orderBy: { sortOrder: "asc" } },
  options: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

export function listProducts() {
  return prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: adminProductInclude,
  });
}

export async function getProduct(id: string) {
  const p = await prisma.product.findFirst({ where: { id, deletedAt: null }, include: adminProductInclude });
  if (!p) throw notFound("Produto");
  return p;
}

type ProductInput = z.infer<typeof productSchema>;

export async function createProduct(input: ProductInput) {
  const { ingredients, options, ...data } = input;
  const p = await prisma.product.create({
    data: {
      ...data,
      ingredients: { create: ingredients.map(({ name, removable }, sortOrder) => ({ name, removable, sortOrder })) },
      options: { create: options.map(({ name, priceCents, maxQuantity, active }, sortOrder) => ({ name, priceCents, maxQuantity, active, sortOrder })) },
    },
    include: adminProductInclude,
  });
  expire(MENU_TAG);
  return p;
}

/** Partial update. When `ingredients`/`options` are sent, they replace the current set (ids kept when given). */
export async function updateProduct(id: string, input: Partial<ProductInput>) {
  await getProduct(id);
  const { ingredients, options, ...data } = input;
  const p = await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data });
    if (ingredients) {
      const keep = ingredients.flatMap((i) => (i.id ? [i.id] : []));
      await tx.productIngredient.deleteMany({ where: { productId: id, id: { notIn: keep } } });
      for (const [sortOrder, i] of ingredients.entries()) {
        const row = { name: i.name, removable: i.removable, sortOrder };
        if (i.id) await tx.productIngredient.updateMany({ where: { id: i.id, productId: id }, data: row });
        else await tx.productIngredient.create({ data: { ...row, productId: id } });
      }
    }
    if (options) {
      const keep = options.flatMap((o) => (o.id ? [o.id] : []));
      await tx.productOption.deleteMany({ where: { productId: id, id: { notIn: keep } } });
      for (const [sortOrder, o] of options.entries()) {
        const row = { name: o.name, priceCents: o.priceCents, maxQuantity: o.maxQuantity, active: o.active, sortOrder };
        if (o.id) await tx.productOption.updateMany({ where: { id: o.id, productId: id }, data: row });
        else await tx.productOption.create({ data: { ...row, productId: id } });
      }
    }
    return tx.product.findUniqueOrThrow({ where: { id }, include: adminProductInclude });
  });
  expire(MENU_TAG);
  return p;
}

/** Soft delete: past orders keep their product reference; the slug is freed for reuse. */
export async function deleteProduct(id: string) {
  const p = await getProduct(id);
  await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isAvailable: false, slug: `${p.slug.slice(0, 50)}--del-${Date.now()}` } });
  expire(MENU_TAG);
}

// ───────────── Categories ─────────────

export const listCategories = () =>
  prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: { where: { deletedAt: null } } } } } });

export async function createCategory(input: z.infer<typeof categorySchema>) {
  const c = await prisma.category.create({ data: input });
  expire(MENU_TAG);
  return c;
}

export async function updateCategory(id: string, input: Partial<z.infer<typeof categorySchema>>) {
  const c = await prisma.category.update({ where: { id }, data: input });
  expire(MENU_TAG);
  return c;
}

export async function deleteCategory(id: string) {
  const inUse = await prisma.product.count({ where: { categoryId: id, deletedAt: null } });
  if (inUse > 0) throw new HttpError(409, "IN_USE", "Mova ou exclua os produtos desta categoria antes.");
  const deleted = await prisma.product.count({ where: { categoryId: id } });
  if (deleted > 0) await prisma.category.update({ where: { id }, data: { active: false } });
  else await prisma.category.delete({ where: { id } });
  expire(MENU_TAG);
}

// ───────────── Coupons ─────────────

export const listCoupons = () => prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { usages: true } } } });

export async function createCoupon(input: z.infer<typeof couponSchema>) {
  const c = await prisma.coupon.create({ data: input });
  expire(PROMOTIONS_TAG);
  return c;
}

export async function updateCoupon(id: string, input: Partial<z.infer<typeof couponSchema>>) {
  const current = await prisma.coupon.findUnique({ where: { id } });
  if (!current) throw notFound("Cupom");
  const merged = { ...current, ...input };
  if (merged.type === "PERCENT" && merged.value > 100) throw new HttpError(422, "VALIDATION_ERROR", "Percentual deve ser 1–100");
  const c = await prisma.coupon.update({ where: { id }, data: input });
  expire(PROMOTIONS_TAG);
  return c;
}

/** Coupons already used are deactivated instead of deleted (history stays intact). */
export async function deleteCoupon(id: string) {
  const used = await prisma.couponUsage.count({ where: { couponId: id } });
  if (used > 0) await prisma.coupon.update({ where: { id }, data: { active: false } });
  else await prisma.coupon.delete({ where: { id } });
  expire(PROMOTIONS_TAG);
}

// ───────────── Store ─────────────

export const listZones = () => prisma.deliveryZone.findMany({ orderBy: [{ sortOrder: "asc" }, { feeCents: "asc" }] });

export async function createZone(input: z.infer<typeof deliveryZoneSchema>) {
  const z = await prisma.deliveryZone.create({ data: input });
  expire(STORE_TAG);
  return z;
}
export async function updateZone(id: string, input: Partial<z.infer<typeof deliveryZoneSchema>>) {
  const z = await prisma.deliveryZone.update({ where: { id }, data: input });
  expire(STORE_TAG);
  return z;
}
export async function deleteZone(id: string) {
  const used = await prisma.order.count({ where: { deliveryZoneId: id } });
  if (used > 0) await prisma.deliveryZone.update({ where: { id }, data: { active: false } });
  else await prisma.deliveryZone.delete({ where: { id } });
  expire(STORE_TAG);
}

export const getSettings = () => prisma.storeSettings.findUniqueOrThrow({ where: { id: 1 } });

export async function updateSettings(input: z.infer<typeof settingsSchema>) {
  const s = await prisma.storeSettings.update({ where: { id: 1 }, data: input });
  expire(STORE_TAG);
  return s;
}

// ───────────── Orders ─────────────

const PAGE_SIZE = 25;
const ACTIVE: OrderStatus[] = ["RECEIVED", "PREPARING", "ASSEMBLING", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP"];

/** Interprets YYYY-MM-DD as a São Paulo calendar day (UTC−3, no DST since 2019). */
const spDay = (d: string, end = false) => new Date(`${d}T${end ? "23:59:59.999" : "00:00:00.000"}-03:00`);

export async function listOrders(q: z.infer<typeof adminOrdersQuery>) {
  const where: Prisma.OrderWhereInput = {
    ...(q.status === "ACTIVE" ? { status: { in: ACTIVE } } : q.status ? { status: q.status } : {}),
    ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: spDay(q.from) } : {}), ...(q.to ? { lte: spDay(q.to, true) } : {}) } } : {}),
    ...(q.q
      ? {
          OR: [
            ...(/^\d+$/.test(q.q) ? [{ number: Number(q.q) }] : []),
            { customerName: { contains: q.q, mode: "insensitive" as const } },
            { customerPhone: { contains: q.q.replace(/\D/g, "") || q.q } },
          ],
        }
      : {}),
  };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        status: true,
        fulfillment: true,
        customerName: true,
        neighborhood: true,
        paymentMethod: true,
        paymentStatus: true,
        totalCents: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
  ]);
  return { total, page: q.page, pageSize: PAGE_SIZE, orders };
}

export async function getAdminOrder(id: string) {
  const o = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { options: true } },
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" }, select: { id: true, method: true, status: true, providerPaymentId: true, providerStatus: true, amountCents: true, createdAt: true } },
      coupon: { select: { code: true } },
      deliveryZone: { select: { name: true } },
      user: { select: { email: true } },
    },
  });
  if (!o) throw notFound("Pedido");
  return { ...o, nextStatuses: allowedNextStatuses(o.status, o.fulfillment) };
}

// ───────────── Dashboard ─────────────

/** Complete series of the last `n` São Paulo calendar days; days without sales are zero, not missing. */
function fillDays(rows: Array<{ day: string; orders: bigint; revenue: bigint }>, n: number) {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const todaySp = new Date(Date.now() - 3 * 3600_000);
  return Array.from({ length: n }, (_, i) => {
    const day = new Date(todaySp.getTime() - (n - 1 - i) * 86400_000).toISOString().slice(0, 10);
    const r = byDay.get(day);
    return { day, orders: Number(r?.orders ?? 0), revenueCents: Number(r?.revenue ?? 0) };
  });
}

export async function dashboard(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const startToday = spDay(new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10));
  const valid = { status: { not: "CANCELED" as const } };
  const [periodAgg, todayAgg, canceled, pending, top, recent, daily] = await Promise.all([
    prisma.order.aggregate({ where: { ...valid, createdAt: { gte: since } }, _sum: { totalCents: true }, _count: true }),
    prisma.order.aggregate({ where: { ...valid, createdAt: { gte: startToday } }, _sum: { totalCents: true }, _count: true }),
    prisma.order.count({ where: { status: "CANCELED", createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: { in: ACTIVE } } }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { ...valid, createdAt: { gte: since } } },
      _sum: { quantity: true, lineTotalCents: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, number: true, customerName: true, status: true, totalCents: true, createdAt: true, fulfillment: true },
    }),
    prisma.$queryRaw<Array<{ day: string; orders: bigint; revenue: bigint }>>`
      -- "createdAt" is timestamp WITHOUT time zone holding UTC: mark it as UTC first, then convert
      -- to São Paulo. A single AT TIME ZONE would read the UTC value as local time (orders after
      -- 21:00 BRT landed on the next day) and the result would depend on the session TimeZone.
      SELECT to_char((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS day,
             COUNT(*) AS orders, COALESCE(SUM("totalCents"), 0) AS revenue
      FROM "Order"
      WHERE "status" <> 'CANCELED' AND "createdAt" >= ${new Date(Date.now() - 14 * 86400_000)}
      GROUP BY 1 ORDER BY 1`,
  ]);
  const orders = periodAgg._count;
  const revenue = periodAgg._sum.totalCents ?? 0;
  return {
    periodDays: days,
    orders,
    revenueCents: revenue,
    averageTicketCents: orders ? Math.round(revenue / orders) : 0,
    cancelRate: orders + canceled ? canceled / (orders + canceled) : 0,
    today: { orders: todayAgg._count, revenueCents: todayAgg._sum.totalCents ?? 0 },
    pending,
    topProducts: top.map((t) => ({ name: t.productName, quantity: t._sum.quantity ?? 0, revenueCents: t._sum.lineTotalCents ?? 0 })),
    recent,
    daily: fillDays(daily, 14),
  };
}
