import { describe, expect, it } from "vitest";
import { computeTotals, evaluateCoupon, priceCart, priceLine, PricingError, type PricingCoupon, type PricingProduct } from "@/server/pricing";

const burger: PricingProduct = {
  id: "p1",
  name: "Smoke Classic",
  priceCents: 3890,
  isAvailable: true,
  allowsDoneness: true,
  ingredients: [
    { id: "i-bun", name: "Brioche", removable: false },
    { id: "i-onion", name: "Cebola", removable: true },
  ],
  options: [
    { id: "o-bacon", name: "Bacon", priceCents: 690, maxQuantity: 2, active: true },
    { id: "o-old", name: "Antigo", priceCents: 100, maxQuantity: 1, active: false },
  ],
};
const line = (over: object = {}) => ({ productId: "p1", quantity: 1, options: [], removedIngredientIds: [], ...over });

describe("priceLine", () => {
  it("adds option prices to the unit price and multiplies by quantity", () => {
    const r = priceLine(burger, line({ quantity: 3, options: [{ optionId: "o-bacon", quantity: 2 }] }));
    expect(r.unitPriceCents).toBe(3890 + 2 * 690);
    expect(r.lineTotalCents).toBe(3 * (3890 + 1380));
    expect(r.options).toEqual([{ optionId: "o-bacon", name: "Bacon", priceCents: 690, quantity: 2 }]);
  });

  it("snapshots removed ingredient names and defaults doneness to MEDIUM", () => {
    const r = priceLine(burger, line({ removedIngredientIds: ["i-onion", "i-onion"] }));
    expect(r.removedIngredients).toEqual(["Cebola"]);
    expect(r.doneness).toBe("MEDIUM");
  });

  it.each([
    ["unknown product", undefined, line(), "PRODUCT_NOT_FOUND"],
    ["unavailable product", { ...burger, isAvailable: false }, line(), "PRODUCT_UNAVAILABLE"],
    ["zero quantity", burger, line({ quantity: 0 }), "INVALID_QUANTITY"],
    ["fractional quantity", burger, line({ quantity: 1.5 }), "INVALID_QUANTITY"],
    ["quantity above 20", burger, line({ quantity: 21 }), "INVALID_QUANTITY"],
    ["inactive option", burger, line({ options: [{ optionId: "o-old", quantity: 1 }] }), "INVALID_OPTION"],
    ["option from another product", burger, line({ options: [{ optionId: "x", quantity: 1 }] }), "INVALID_OPTION"],
    ["option above max", burger, line({ options: [{ optionId: "o-bacon", quantity: 3 }] }), "INVALID_OPTION"],
    ["duplicated option", burger, line({ options: [{ optionId: "o-bacon", quantity: 1 }, { optionId: "o-bacon", quantity: 1 }] }), "INVALID_OPTION"],
    ["non-removable ingredient", burger, line({ removedIngredientIds: ["i-bun"] }), "INVALID_INGREDIENT"],
    ["doneness on smash", { ...burger, allowsDoneness: false }, line({ doneness: "RARE" }), "DONENESS_NOT_ALLOWED"],
  ] as const)("rejects %s", (_n, product, input, code) => {
    expect(() => priceLine(product as PricingProduct | undefined, input as never)).toThrowError(expect.objectContaining({ code }));
  });

  it("returns null doneness for products without doneness", () => {
    expect(priceLine({ ...burger, allowsDoneness: false }, line()).doneness).toBeNull();
  });
});

describe("priceCart", () => {
  it("rejects empty carts and carts with too many lines", () => {
    const map = new Map([["p1", burger]]);
    expect(() => priceCart(map, [])).toThrow(PricingError);
    expect(() => priceCart(map, Array.from({ length: 31 }, () => line()))).toThrowError(expect.objectContaining({ code: "TOO_MANY_LINES" }));
  });
});

const coupon = (over: Partial<PricingCoupon> = {}): PricingCoupon => ({
  code: "X",
  type: "PERCENT",
  value: 15,
  minOrderCents: 5000,
  maxUses: 10,
  usesCount: 0,
  startsAt: null,
  expiresAt: null,
  active: true,
  ...over,
});
const now = new Date("2026-06-10T20:00:00Z");

describe("evaluateCoupon", () => {
  it("floors percentage discounts to whole cents", () => {
    expect(evaluateCoupon(coupon(), 10_001, now)).toEqual({ ok: true, discountCents: 1500 });
  });
  it("caps a fixed discount at the subtotal", () => {
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 9000, minOrderCents: 0 }), 4000, now)).toEqual({ ok: true, discountCents: 4000 });
  });
  it("accepts exactly the minimum order", () => {
    expect(evaluateCoupon(coupon(), 5000, now).ok).toBe(true);
  });
  it.each([
    ["INACTIVE", coupon({ active: false }), 9000],
    ["NOT_STARTED", coupon({ startsAt: new Date("2026-06-11T00:00:00Z") }), 9000],
    ["EXPIRED", coupon({ expiresAt: new Date("2026-06-10T20:00:00Z") }), 9000],
    ["EXHAUSTED", coupon({ maxUses: 3, usesCount: 3 }), 9000],
    ["BELOW_MINIMUM", coupon(), 4999],
  ] as const)("rejects %s", (reason, c, subtotal) => {
    expect(evaluateCoupon(c, subtotal, now)).toEqual({ ok: false, reason });
  });
});

describe("computeTotals", () => {
  it("applies discount to the subtotal only and adds the delivery fee", () => {
    const l = priceLine(burger, line({ quantity: 2 }));
    expect(computeTotals({ lines: [l], deliveryFeeCents: 690, discountCents: 1000 })).toEqual({
      subtotalCents: 7780,
      discountCents: 1000,
      deliveryFeeCents: 690,
      totalCents: 7780 - 1000 + 690,
    });
  });
  it("never lets the discount exceed the subtotal", () => {
    const l = priceLine(burger, line());
    expect(computeTotals({ lines: [l], deliveryFeeCents: 500, discountCents: 99_999 }).totalCents).toBe(500);
  });
});
