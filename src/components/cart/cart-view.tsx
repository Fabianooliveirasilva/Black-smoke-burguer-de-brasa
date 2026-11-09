"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { useMounted } from "@/hooks/use-mounted";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CheckoutConfig } from "@/server/checkout-config";
import { unitEstimate, useCart } from "./cart-store";
import { TotalsRows } from "./cart-summary";
import { useQuote } from "./use-quote";

const DONENESS_LABEL = { RARE: "mal passado", MEDIUM: "ao ponto", WELL_DONE: "bem passado" } as const;

export function CartView({ config }: { config: CheckoutConfig }) {
  const mounted = useMounted();
  const { items, setQuantity, remove, couponCode, setCoupon, fulfillment, setFulfillment, deliveryZoneId, setZone } = useCart();
  const { quote, error } = useQuote();
  const [couponInput, setCouponInput] = useState("");

  if (!mounted) return <div className="mt-10 h-[40svh] animate-pulse rounded bg-fuligem/60" />;

  if (items.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-start gap-6 border-t border-osso/10 pt-10">
        <p className="max-w-md text-lg text-fumaca">Seu pedido está vazio. Comece pelo que a casa mais vende.</p>
        <ButtonLink href="/cardapio" size="lg">
          Abrir o cardápio
        </ButtonLink>
      </div>
    );
  }

  const effective: "DELIVERY" | "PICKUP" = !config.deliveryEnabled ? "PICKUP" : !config.pickupEnabled ? "DELIVERY" : fulfillment;
  const zoneValid = config.zones.some((z) => z.id === deliveryZoneId);
  const lineErrors = quote?.lines.filter((l) => l.error) ?? [];
  // Minimum applies to delivery only (D-02) — same rule as createOrder on the server.
  const belowMin = quote && effective === "DELIVERY" ? quote.subtotalCents < config.minOrderCents : false;
  const canCheckout = config.open && !!quote && lineErrors.length === 0 && !belowMin && (effective === "PICKUP" || zoneValid);

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <ul className="flex flex-col" aria-label="Itens do pedido">
          {items.map((item, index) => {
            const q = quote?.lines.find((l) => l.index === index);
            return (
              <li
                key={item.key}
                className="border-b border-osso/10 py-6"
                data-testid="cart-line"
              >
                <div className="flex gap-4">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-fuligem sm:size-24">
                    <Image src={item.image} alt="" fill sizes="96px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="display text-3xl">{item.name}</h2>
                      <p className="tabular shrink-0 pt-1 font-semibold" data-testid="line-total">
                        {formatBRL(q?.lineTotalCents ?? unitEstimate(item) * item.quantity)}
                      </p>
                    </div>
                    <ul className="mt-1 text-sm text-fumaca">
                      {item.doneness && <li>Ponto: {DONENESS_LABEL[item.doneness]}</li>}
                      {item.options.map((o) => (
                        <li key={o.optionId}>
                          + {o.quantity > 1 ? `${o.quantity}× ` : ""}
                          {o.name}
                        </li>
                      ))}
                      {item.removedNames.map((n) => (
                        <li key={n}>Sem {n.toLowerCase()}</li>
                      ))}
                      {item.notes && <li>“{item.notes}”</li>}
                    </ul>
                    {q?.error && (
                      <p className="mt-2 text-sm text-[#ff8a70]" role="alert">
                        {q.error}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <Stepper size="sm" label={`Quantidade de ${item.name}`} value={item.quantity} min={1} max={20} onChange={(v) => setQuantity(item.key, v)} />
                      <div className="flex gap-1">
                        <Link href={`/cardapio/${item.slug}?editar=${item.key}`} className={buttonClass("ghost", "sm")}>
                          <Pencil className="size-4" aria-hidden /> Editar
                        </Link>
                        <button type="button" onClick={() => remove(item.key)} className={buttonClass("ghost", "sm")} aria-label={`Remover ${item.name}`}>
                          <Trash2 className="size-4" aria-hidden /> Remover
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        <li className="pt-6">
          <Link href="/cardapio" className="text-sm text-fumaca underline underline-offset-4 hover:text-osso">
            Adicionar mais itens
          </Link>
        </li>
      </ul>

      <aside className="ticket rounded-sm px-6 sm:px-8 lg:sticky lg:top-28" aria-label="Resumo do pedido">
        <p className="display text-3xl">Comanda</p>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">Como você quer receber?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["DELIVERY", "PICKUP"] as const).map((f) => {
              const disabled = f === "DELIVERY" ? !config.deliveryEnabled : !config.pickupEnabled;
              return (
                <label
                  key={f}
                  className={cn(
                    "flex cursor-pointer items-center justify-center rounded-full border-2 px-3 py-2.5 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-tinta",
                    effective === f ? "border-tinta bg-tinta text-kraft" : "border-tinta/25",
                    disabled && "pointer-events-none opacity-40",
                  )}
                >
                  <input type="radio" className="sr-only" name="fulfillment" checked={effective === f} disabled={disabled} onChange={() => setFulfillment(f)} />
                  {f === "DELIVERY" ? "Entrega" : "Retirar"}
                </label>
              );
            })}
          </div>
        </fieldset>

        {effective === "DELIVERY" ? (
          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="zone" className="text-sm font-semibold">
              Região de entrega
            </label>
            <select
              id="zone"
              value={zoneValid ? (deliveryZoneId ?? "") : ""}
              onChange={(e) => setZone(e.target.value || null)}
              className="h-11 rounded-xl border-2 border-tinta/25 bg-transparent px-3 text-tinta focus:border-tinta focus:outline-none"
            >
              <option value="">Selecione</option>
              {config.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} — {formatBRL(z.feeCents)} · ~{z.etaMinutes} min
                </option>
              ))}
            </select>
            {zoneValid && (
              <p className="text-xs text-tinta/75">Bairros: {config.zones.find((z) => z.id === deliveryZoneId)?.neighborhoods.join(", ")}</p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-tinta/80">
            Retire em {config.pickupAddress}. Fica pronto em cerca de {config.prepTimeMinutes} minutos.
          </p>
        )}

        <div className="ticket-rule mt-6 pt-5">
          {quote?.coupon ? (
            <div className="flex items-center justify-between gap-3 text-sm">
              <p>
                Cupom <strong>{quote.coupon.code}</strong>: {quote.coupon.description}
              </p>
              <button type="button" className="shrink-0 underline" onClick={() => setCoupon(null)}>
                Remover
              </button>
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (couponInput.trim()) setCoupon(couponInput.trim().toUpperCase());
              }}
            >
              <label htmlFor="coupon" className="sr-only">
                Cupom de desconto
              </label>
              <input
                id="coupon"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Cupom"
                autoCapitalize="characters"
                className="h-11 min-w-0 flex-1 rounded-full border-2 border-tinta/25 bg-transparent px-4 font-semibold tracking-wide text-tinta uppercase placeholder:text-tinta/50 placeholder:normal-case focus:border-tinta focus:outline-none"
              />
              <button type="submit" className={buttonClass("ink", "md")}>
                Aplicar
              </button>
            </form>
          )}
          {couponCode && quote?.couponError && (
            <p className="mt-2 text-sm font-medium text-sangue" role="alert" data-testid="coupon-error">
              {couponCode}: {quote.couponError}{" "}
              <button type="button" className="underline" onClick={() => setCoupon(null)}>
                Remover
              </button>
            </p>
          )}
        </div>

        <div className="ticket-rule mt-6 pt-5">
          <TotalsRows quote={quote} fulfillment={effective} zoneChosen={zoneValid} />
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {error && <p className="text-sm text-sangue" role="alert">{error}</p>}
          {!config.open && <p className="text-sm font-semibold text-sangue">{config.closedReason}</p>}
          {belowMin && <p className="text-sm text-sangue">Pedido mínimo para entrega: {formatBRL(config.minOrderCents)}. Na retirada não há mínimo.</p>}
          {canCheckout ? (
            <ButtonLink href="/checkout" variant="ink" size="lg" className="w-full" data-testid="go-checkout">
              Continuar para o checkout
            </ButtonLink>
          ) : (
            <button type="button" disabled className={buttonClass("ink", "lg", "w-full")}>
              {effective === "DELIVERY" && !zoneValid ? "Escolha a região de entrega" : "Continuar para o checkout"}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
