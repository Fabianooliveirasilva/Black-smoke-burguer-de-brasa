import type { Metadata } from "next";
import { Suspense } from "react";
import { getCheckoutConfig } from "@/server/checkout-config";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false } };

async function Cart() {
  const config = await getCheckoutConfig();
  return <CartView config={config} />;
}

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <h1 className="display text-[clamp(3.5rem,11vw,7rem)]">Seu pedido</h1>
      {/* Stable min-height: cart content depends on localStorage, so the area must not resize the page when it fills in. */}
      <div className="min-h-[60svh]">
      <Suspense fallback={<div className="mt-10 h-[40svh] animate-pulse rounded bg-fuligem/60" />}>
        <Cart />
      </Suspense>
      </div>
    </div>
  );
}
