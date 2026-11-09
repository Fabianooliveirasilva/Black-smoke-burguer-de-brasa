"use client";
import { formatBRL } from "@/lib/money";
import type { Quote } from "./use-quote";

export function TotalsRows({ quote, fulfillment, zoneChosen }: { quote: Quote | null; fulfillment: "DELIVERY" | "PICKUP"; zoneChosen: boolean }) {
  return (
    <dl className="tabular flex flex-col gap-2 text-[0.95rem]" data-testid="cart-totals">
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd data-testid="subtotal">{quote ? formatBRL(quote.subtotalCents) : "—"}</dd>
      </div>
      {quote && quote.discountCents > 0 && (
        <div className="flex justify-between text-sangue">
          <dt>Desconto ({quote.coupon?.code})</dt>
          <dd data-testid="discount">− {formatBRL(quote.discountCents)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt>{fulfillment === "PICKUP" ? "Retirada no balcão" : "Entrega"}</dt>
        <dd data-testid="delivery-fee">
          {fulfillment === "PICKUP" ? "Grátis" : !zoneChosen ? "Escolha a região" : quote ? formatBRL(quote.deliveryFeeCents) : "—"}
        </dd>
      </div>
      <div className="ticket-rule mt-2 flex items-baseline justify-between pt-3">
        <dt className="font-semibold">Total</dt>
        <dd className="display text-4xl" data-testid="total">
          {quote ? formatBRL(quote.totalCents) : "—"}
        </dd>
      </div>
    </dl>
  );
}
