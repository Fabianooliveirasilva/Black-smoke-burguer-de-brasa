import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { quoteCart } from "@/server/quote";
import { catalog } from "../support/fixtures";

describe("quoteCart", () => {
  it("reports per-line problems instead of failing the whole cart", async () => {
    const { smoke, fries, zone } = await catalog();
    const q = await quoteCart({
      items: [
        { productId: smoke.id, quantity: 1, options: [], removedIngredientIds: [], doneness: null },
        { productId: "does-not-exist", quantity: 1, options: [], removedIngredientIds: [], doneness: null },
        { productId: fries.id, quantity: 2, options: [], removedIngredientIds: [], doneness: null },
      ],
      deliveryZoneId: zone.id,
      couponCode: "SMOKE10",
    });
    expect(q.lines[1].error).toBe("Produto não encontrado.");
    expect(q.subtotalCents).toBe(smoke.priceCents + 2 * fries.priceCents);
    expect(q.deliveryFeeCents).toBe(zone.feeCents);
    expect(q.couponError).toBe("O subtotal não atinge o valor mínimo do cupom.");
    expect(q.discountCents).toBe(0);
  });

  it("hides soft-deleted products", async () => {
    const p = await prisma.product.create({
      data: { slug: "deleted-x", name: "X", description: "x", priceCents: 100, imageUrl: "/images/x.jpg", categoryId: (await catalog()).smoke.categoryId, deletedAt: new Date() },
    });
    const q = await quoteCart({ items: [{ productId: p.id, quantity: 1, options: [], removedIngredientIds: [], doneness: null }] });
    expect(q.lines[0].error).toBe("Produto não encontrado.");
  });
});
