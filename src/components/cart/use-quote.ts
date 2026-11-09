"use client";
import { useEffect, useState } from "react";
import { toLineInput, useCart } from "./cart-store";

export interface Quote {
  lines: Array<{ index: number; unitPriceCents: number | null; lineTotalCents: number | null; error: string | null }>;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  coupon: { code: string; description: string } | null;
  couponError: string | null;
  minOrderCents: number;
}

/** Fetches the authoritative server quote for the current cart (debounced). */
export function useQuote() {
  const items = useCart((s) => s.items);
  const couponCode = useCart((s) => s.couponCode);
  const fulfillment = useCart((s) => s.fulfillment);
  const zoneId = useCart((s) => s.deliveryZoneId);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const body = JSON.stringify({
    items: items.map(toLineInput),
    couponCode,
    deliveryZoneId: fulfillment === "DELIVERY" ? zoneId : null,
  });

  useEffect(() => {
    if (items.length === 0) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message ?? "Não foi possível calcular o pedido.");
        setQuote(data);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  return { quote: items.length ? quote : null, loading, error };
}
