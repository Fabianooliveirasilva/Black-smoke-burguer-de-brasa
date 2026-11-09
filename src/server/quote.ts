import "server-only";
import { prisma } from "@/lib/prisma";
import { loadPricingProducts } from "./catalog";
import { computeTotals, couponMessages, evaluateCoupon, PricingError, priceLine, type LineInput, type PricedLine } from "./pricing";

/**
 * Server-side cart quote. Unlike order creation it does not throw on a bad line:
 * it reports per-line problems so the cart UI can explain them.
 */
export async function quoteCart(input: { items: LineInput[]; couponCode?: string | null; deliveryZoneId?: string | null }, now = new Date()) {
  const products = await loadPricingProducts(input.items.map((i) => i.productId));
  const lines: Array<{ index: number; line?: PricedLine; error?: string }> = input.items.map((item, index) => {
    try {
      return { index, line: priceLine(products.get(item.productId), item) };
    } catch (e) {
      if (e instanceof PricingError) return { index, error: e.message };
      throw e;
    }
  });
  const valid = lines.flatMap((l) => (l.line ? [l.line] : []));

  let deliveryFeeCents = 0;
  if (input.deliveryZoneId) {
    const zone = await prisma.deliveryZone.findFirst({ where: { id: input.deliveryZoneId, active: true } });
    deliveryFeeCents = zone?.feeCents ?? 0;
  }

  const { subtotalCents } = computeTotals({ lines: valid, deliveryFeeCents: 0, discountCents: 0 });
  let discountCents = 0;
  let coupon: { code: string; description: string } | null = null;
  let couponError: string | null = null;
  if (input.couponCode) {
    const c = await prisma.coupon.findUnique({ where: { code: input.couponCode } });
    if (!c) couponError = couponMessages.INACTIVE;
    else {
      const r = evaluateCoupon(c, subtotalCents, now);
      if (r.ok) {
        discountCents = r.discountCents;
        coupon = { code: c.code, description: c.description };
      } else couponError = couponMessages[r.reason];
    }
  }
  const settings = await prisma.storeSettings.findUnique({ where: { id: 1 }, select: { minOrderCents: true } });
  return {
    lines: lines.map((l) => ({ index: l.index, unitPriceCents: l.line?.unitPriceCents ?? null, lineTotalCents: l.line?.lineTotalCents ?? null, error: l.error ?? null })),
    ...computeTotals({ lines: valid, deliveryFeeCents, discountCents }),
    coupon,
    couponError,
    minOrderCents: settings?.minOrderCents ?? 0,
  };
}
