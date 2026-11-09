/** Shared (server + client) product form value mapping. */
export interface Values {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  price: string;
  imageUrl: string;
  categoryId: string;
  isPopular: boolean;
  isAvailable: boolean;
  allowsDoneness: boolean;
  sortOrder: number;
  ingredients: Array<{ id?: string; name: string; removable: boolean }>;
  options: Array<{ id?: string; name: string; price: string; maxQuantity: number; active: boolean }>;
}

export interface ProductFormData {
  id?: string;
  values: Values;
}

const cents = (v: number) => (v / 100).toFixed(2).replace(".", ",");
export const toFormValues = (p: {
  name: string; slug: string; tagline: string | null; description: string; priceCents: number; imageUrl: string; categoryId: string;
  isPopular: boolean; isAvailable: boolean; allowsDoneness: boolean; sortOrder: number;
  ingredients: Array<{ id: string; name: string; removable: boolean }>;
  options: Array<{ id: string; name: string; priceCents: number; maxQuantity: number; active: boolean }>;
}): Values => ({
  ...p,
  tagline: p.tagline ?? "",
  price: cents(p.priceCents),
  ingredients: p.ingredients.map(({ id, name, removable }) => ({ id, name, removable })),
  options: p.options.map(({ id, name, priceCents, maxQuantity, active }) => ({ id, name, price: cents(priceCents), maxQuantity, active })),
});

