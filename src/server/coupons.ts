import "server-only";
import { HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { loadPricingProducts } from "./catalog";
import { computeTotals, couponMessages, evaluateCoupon, priceCart, type LineInput } from "./pricing";

/** Validates a coupon against a cart priced from the database. Never trusts client totals. */
export async function previewCoupon(code: string, items: LineInput[], now = new Date()) {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) throw new HttpError(422, "COUPON_INVALID", couponMessages.INACTIVE);
  const products = await loadPricingProducts(items.map((i) => i.productId));
  const lines = priceCart(products, items);
  const { subtotalCents } = computeTotals({ lines, deliveryFeeCents: 0, discountCents: 0 });
  const result = evaluateCoupon(coupon, subtotalCents, now);
  if (!result.ok) throw new HttpError(422, `COUPON_${result.reason}`, couponMessages[result.reason]);
  return { code: coupon.code, description: coupon.description, subtotalCents, discountCents: result.discountCents };
}
