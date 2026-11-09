import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getOrderByToken } from "@/server/orders";
import { toTrackingView } from "@/server/order-view";
import { OrderTracker } from "@/components/cart/order-tracker";

export const metadata: Metadata = { title: "Acompanhar pedido", robots: { index: false, follow: false } };

async function Tracking({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();
  return <OrderTracker initial={toTrackingView(order)} />;
}

export default function TrackingPage({ params }: PageProps<"/pedido/[token]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded bg-fuligem" />}>
        <Tracking params={params} />
      </Suspense>
    </div>
  );
}
