import type { Metadata } from "next";
import { Suspense } from "react";
import { getCheckoutConfig } from "@/server/checkout-config";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "@/components/cart/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

async function Checkout() {
  const [config, user] = await Promise.all([getCheckoutConfig(), currentUser()]);
  const profile = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, email: true, phone: true, addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] } },
      })
    : null;
  return (
    <CheckoutForm
      config={config}
      profile={
        profile && {
          name: profile.name,
          email: profile.email,
          phone: profile.phone ?? "",
          addresses: profile.addresses.map((a) => ({ id: a.id, label: a.label, street: a.street, number: a.number, complement: a.complement ?? "", neighborhood: a.neighborhood, city: a.city, cep: a.cep, reference: a.reference ?? "" })),
        }
      }
    />
  );
}

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <h1 className="display text-[clamp(3.5rem,11vw,7rem)]">Checkout</h1>
      {/* Stable min-height: cart content depends on localStorage, so the area must not resize the page when it fills in. */}
      <div className="min-h-[60svh]">
      <Suspense fallback={<div className="mt-10 h-[40svh] animate-pulse rounded bg-fuligem/60" />}>
        <Checkout />
      </Suspense>
      </div>
    </div>
  );
}
