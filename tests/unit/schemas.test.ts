import { describe, expect, it } from "vitest";
import { createOrderSchema } from "@/schemas/order";
import { couponSchema, productSchema } from "@/schemas/catalog";
import { profileSchema } from "@/schemas/account";

const base = {
  customer: { name: "Ana Souza", phone: "(11) 91234-5678" },
  items: [{ productId: "abc", quantity: 1 }],
  paymentMethod: "CASH",
};

describe("createOrderSchema", () => {
  it("normalises phone and strips client-sent prices (mass assignment)", () => {
    const r = createOrderSchema.parse({ ...base, fulfillment: "PICKUP", totalCents: 1, items: [{ productId: "abc", quantity: 1, unitPriceCents: 1 }] });
    expect(r.customer.phone).toBe("11912345678");
    expect(r).not.toHaveProperty("totalCents");
    expect(r.items[0]).not.toHaveProperty("unitPriceCents");
  });
  it("requires an address and zone for delivery", () => {
    expect(createOrderSchema.safeParse({ ...base, fulfillment: "DELIVERY" }).success).toBe(false);
  });
  it.each(["123", "(00) 91234-5678", "11 1234"])("rejects invalid phone %s", (phone) => {
    expect(createOrderSchema.safeParse({ ...base, fulfillment: "PICKUP", customer: { name: "Ana", phone } }).success).toBe(false);
  });
  it("rejects injection-shaped ids", () => {
    expect(createOrderSchema.safeParse({ ...base, fulfillment: "PICKUP", items: [{ productId: "1' OR '1'='1", quantity: 1 }] }).success).toBe(false);
  });
});

describe("admin schemas", () => {
  it("limits percent coupons to 100", () => {
    expect(couponSchema.safeParse({ code: "AAA", description: "x", type: "PERCENT", value: 101 }).success).toBe(false);
    expect(couponSchema.safeParse({ code: "AAA", description: "x", type: "FIXED", value: 10100 }).success).toBe(true);
  });
  it("only accepts local image paths (no external/javascript URLs)", () => {
    const p = { name: "X", slug: "x-burger", description: "d", priceCents: 100, categoryId: "c1" };
    expect(productSchema.safeParse({ ...p, imageUrl: "/media/abc.webp" }).success).toBe(true);
    expect(productSchema.safeParse({ ...p, imageUrl: "https://evil.example/x.png" }).success).toBe(false);
    expect(productSchema.safeParse({ ...p, imageUrl: "javascript:alert(1)" }).success).toBe(false);
  });
  it("profile updates cannot set role (strict)", () => {
    expect(profileSchema.safeParse({ name: "Ana", role: "admin" }).success).toBe(false);
  });
});
