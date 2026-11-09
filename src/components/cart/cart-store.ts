"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Doneness } from "@/server/pricing";

export interface CartOption {
  optionId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  basePriceCents: number;
  quantity: number;
  options: CartOption[];
  removedIngredientIds: string[];
  removedNames: string[];
  doneness: Doneness | null;
  notes: string;
}

/** Display-only estimate. The server recomputes every price from the database. */
export const unitEstimate = (i: CartItem) => i.basePriceCents + i.options.reduce((s, o) => s + o.priceCents * o.quantity, 0);

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  fulfillment: "DELIVERY" | "PICKUP";
  deliveryZoneId: string | null;
  setFulfillment: (f: "DELIVERY" | "PICKUP") => void;
  setZone: (id: string | null) => void;
  add: (item: Omit<CartItem, "key">) => void;
  update: (key: string, item: Omit<CartItem, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  setCoupon: (code: string | null) => void;
  clear: () => void;
}

const signature = (i: Omit<CartItem, "key">) =>
  JSON.stringify([i.productId, [...i.options].sort((a, b) => a.optionId.localeCompare(b.optionId)), [...i.removedIngredientIds].sort(), i.doneness, i.notes.trim()]);

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      fulfillment: "DELIVERY",
      deliveryZoneId: null,
      setFulfillment: (fulfillment) => set({ fulfillment }),
      setZone: (deliveryZoneId) => set({ deliveryZoneId }),
      add: (item) =>
        set((s) => {
          const sig = signature(item);
          const same = s.items.find((i) => signature(i) === sig);
          if (same) {
            return { items: s.items.map((i) => (i === same ? { ...i, quantity: Math.min(20, i.quantity + item.quantity) } : i)) };
          }
          return { items: [...s.items, { ...item, key: crypto.randomUUID() }] };
        }),
      update: (key, item) => set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...item, key } : i)) })),
      setQuantity: (key, quantity) =>
        set((s) => ({
          items: quantity <= 0 ? s.items.filter((i) => i.key !== key) : s.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(20, quantity) } : i)),
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      setCoupon: (couponCode) => set({ couponCode }),
      clear: () => set({ items: [], couponCode: null }),
    }),
    { name: "bsb-cart-v1", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

export const toLineInput = (i: CartItem) => ({
  productId: i.productId,
  quantity: i.quantity,
  options: i.options.map((o) => ({ optionId: o.optionId, quantity: o.quantity })),
  removedIngredientIds: i.removedIngredientIds,
  doneness: i.doneness,
  notes: i.notes || null,
});
