import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isOpenAt, type OpeningWindow } from "./hours";

export const STORE_TAG = "store";

export async function getStore() {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  const [settings, zones] = await Promise.all([
    prisma.storeSettings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.deliveryZone.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { feeCents: "asc" }] }),
  ]);
  return { settings: { ...settings, openingHours: settings.openingHours as unknown as OpeningWindow[] }, zones };
}
export type Store = Awaited<ReturnType<typeof getStore>>;

export function storeIsAcceptingOrders(store: Store["settings"], now = new Date()) {
  if (store.ordersPaused) return { open: false, reason: "Pedidos pausados no momento." } as const;
  if (!isOpenAt(now, store.openingHours)) return { open: false, reason: "Estamos fechados agora. Confira nossos horários." } as const;
  return { open: true } as const;
}

export const PROMOTIONS_TAG = "promotions";

export async function getPromotions() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROMOTIONS_TAG);
  return prisma.coupon.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: { code: true, description: true, type: true, value: true, minOrderCents: true, maxUses: true, usesCount: true, startsAt: true, expiresAt: true },
  });
}
