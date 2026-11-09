import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { dashboard } from "@/server/admin";
import { createOrder } from "@/server/orders";
import { deliveryInput } from "../support/fixtures";

const spToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

describe("dashboard daily series (BUG-04)", () => {
  it("buckets an order placed at 22:30 in São Paulo on that São Paulo day, not on the next UTC day", async () => {
    const today = spToday();
    const bucket = async () => (await dashboard(30)).daily.find((d) => d.day === today)!;
    const before = await bucket();

    const { order } = await createOrder(await deliveryInput(), null);
    // 22:30 BRT = 01:30 UTC of the next day — the peak-hour window the bug misplaced.
    await prisma.order.update({ where: { id: order.id }, data: { createdAt: new Date(`${today}T22:30:00-03:00`) } });

    const after = await bucket();
    expect(after.orders).toBe(before.orders + 1);
    expect(after.revenueCents).toBe(before.revenueCents + order.totalCents);
  });
});
