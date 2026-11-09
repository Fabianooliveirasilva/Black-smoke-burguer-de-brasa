/**
 * Pure pricing rules. No I/O — every financial value of an order is derived here
 * from database records, never from client-supplied prices.
 */
export type Doneness = "RARE" | "MEDIUM" | "WELL_DONE";

export const MAX_LINE_QUANTITY = 20;
export const MAX_LINES = 30;

export interface PricingProduct {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
  allowsDoneness: boolean;
  ingredients: Array<{ id: string; name: string; removable: boolean }>;
  options: Array<{ id: string; name: string; priceCents: number; maxQuantity: number; active: boolean }>;
}

export interface LineInput {
  productId: string;
  quantity: number;
  options: Array<{ optionId: string; quantity: number }>;
  removedIngredientIds: string[];
  doneness?: Doneness | null;
  notes?: string | null;
}

export interface PricedLine {
  productId: string;
  productName: string;
  basePriceCents: number;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  doneness: Doneness | null;
  removedIngredients: string[];
  notes: string | null;
  options: Array<{ optionId: string; name: string; priceCents: number; quantity: number }>;
}

export class PricingError extends Error {
  constructor(
    public code:
      | "PRODUCT_NOT_FOUND"
      | "PRODUCT_UNAVAILABLE"
      | "INVALID_QUANTITY"
      | "INVALID_OPTION"
      | "INVALID_INGREDIENT"
      | "DONENESS_NOT_ALLOWED"
      | "TOO_MANY_LINES"
      | "EMPTY_ORDER",
    message: string,
  ) {
    super(message);
  }
}

export function priceLine(product: PricingProduct | undefined, line: LineInput): PricedLine {
  if (!product) throw new PricingError("PRODUCT_NOT_FOUND", "Produto não encontrado.");
  if (!product.isAvailable) throw new PricingError("PRODUCT_UNAVAILABLE", `${product.name} está indisponível no momento.`);
  if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_LINE_QUANTITY) {
    throw new PricingError("INVALID_QUANTITY", `Quantidade inválida para ${product.name}.`);
  }
  if (line.doneness && !product.allowsDoneness) {
    throw new PricingError("DONENESS_NOT_ALLOWED", `${product.name} não tem ponto da carne.`);
  }

  const seen = new Set<string>();
  const options = line.options.map((sel) => {
    const opt = product.options.find((o) => o.id === sel.optionId && o.active);
    if (!opt || seen.has(sel.optionId)) throw new PricingError("INVALID_OPTION", `Adicional inválido em ${product.name}.`);
    seen.add(sel.optionId);
    if (!Number.isInteger(sel.quantity) || sel.quantity < 1 || sel.quantity > opt.maxQuantity) {
      throw new PricingError("INVALID_OPTION", `Quantidade de ${opt.name} acima do permitido.`);
    }
    return { optionId: opt.id, name: opt.name, priceCents: opt.priceCents, quantity: sel.quantity };
  });

  const removedIngredients = [...new Set(line.removedIngredientIds)].map((id) => {
    const ing = product.ingredients.find((i) => i.id === id);
    if (!ing || !ing.removable) throw new PricingError("INVALID_INGREDIENT", `Ingrediente não pode ser removido de ${product.name}.`);
    return ing.name;
  });

  const unitPriceCents = product.priceCents + options.reduce((sum, o) => sum + o.priceCents * o.quantity, 0);
  return {
    productId: product.id,
    productName: product.name,
    basePriceCents: product.priceCents,
    unitPriceCents,
    quantity: line.quantity,
    lineTotalCents: unitPriceCents * line.quantity,
    doneness: product.allowsDoneness ? (line.doneness ?? "MEDIUM") : null,
    removedIngredients,
    notes: line.notes?.trim() || null,
    options,
  };
}

export interface PricingCoupon {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderCents: number;
  maxUses: number | null;
  usesCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  active: boolean;
}

export type CouponRejection = "INACTIVE" | "NOT_STARTED" | "EXPIRED" | "EXHAUSTED" | "BELOW_MINIMUM";

export const couponMessages: Record<CouponRejection, string> = {
  INACTIVE: "Cupom inválido.",
  NOT_STARTED: "Este cupom ainda não está valendo.",
  EXPIRED: "Este cupom expirou.",
  EXHAUSTED: "Este cupom atingiu o limite de usos.",
  BELOW_MINIMUM: "O subtotal não atinge o valor mínimo do cupom.",
};

export function evaluateCoupon(
  coupon: PricingCoupon,
  subtotalCents: number,
  now: Date,
): { ok: true; discountCents: number } | { ok: false; reason: CouponRejection } {
  if (!coupon.active) return { ok: false, reason: "INACTIVE" };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, reason: "NOT_STARTED" };
  if (coupon.expiresAt && now >= coupon.expiresAt) return { ok: false, reason: "EXPIRED" };
  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) return { ok: false, reason: "EXHAUSTED" };
  if (subtotalCents < coupon.minOrderCents) return { ok: false, reason: "BELOW_MINIMUM" };
  const raw = coupon.type === "PERCENT" ? Math.floor((subtotalCents * coupon.value) / 100) : coupon.value;
  return { ok: true, discountCents: Math.max(0, Math.min(raw, subtotalCents)) };
}

export function computeTotals(input: { lines: PricedLine[]; deliveryFeeCents: number; discountCents: number }) {
  const subtotalCents = input.lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const discountCents = Math.min(input.discountCents, subtotalCents);
  const totalCents = subtotalCents - discountCents + input.deliveryFeeCents;
  return { subtotalCents, discountCents, deliveryFeeCents: input.deliveryFeeCents, totalCents };
}

export function priceCart(products: Map<string, PricingProduct>, lines: LineInput[]): PricedLine[] {
  if (lines.length === 0) throw new PricingError("EMPTY_ORDER", "O pedido está vazio.");
  if (lines.length > MAX_LINES) throw new PricingError("TOO_MANY_LINES", "Pedido com itens demais.");
  return lines.map((l) => priceLine(products.get(l.productId), l));
}
