"use client";
import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TrackingView } from "@/server/order-view";

const PAYMENT_LABEL = { PIX: "Pix", CARD_ONLINE: "Cartão online", CARD_ON_DELIVERY: "Cartão na entrega", CASH: "Dinheiro" } as const;
const PAYMENT_STATUS = { PENDING: "Aguardando", PAID: "Pago", FAILED: "Recusado", REFUNDED: "Estornado" } as const;
const DONENESS = { RARE: "mal passado", MEDIUM: "ao ponto", WELL_DONE: "bem passado" } as const;
const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export function OrderTracker({ initial }: { initial: TrackingView }) {
  const [order, setOrder] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const finished = order.status === "DELIVERED" || order.status === "CANCELED";

  useEffect(() => {
    if (finished) return;
    const id = setInterval(async () => {
      if (document.hidden) return;
      const res = await fetch(`/api/orders/track/${order.token}`, { cache: "no-store" });
      if (res.ok) setOrder(await res.json());
    }, 10_000);
    return () => clearInterval(id);
  }, [order.token, finished]);

  const act = async (path: "cancel" | "pay") => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/track/${order.token}/${path}`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (res.ok) setOrder(data);
    else setError(data?.error?.message ?? "Não foi possível concluir.");
    setBusy(false);
  };

  const currentIdx = order.steps.findIndex((s) => s.status === order.status);
  const online = order.paymentMethod === "PIX" || order.paymentMethod === "CARD_ONLINE";
  const awaitingOnline = online && order.paymentStatus !== "PAID" && order.status === "RECEIVED";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
      <div>
        <p className="text-fumaca">Pedido #{order.number}</p>
        <h1 className="display mt-2 text-[clamp(3.2rem,9vw,6rem)]" aria-live="polite" data-testid="order-status">
          {order.status === "CANCELED" ? "Cancelado" : order.statusLabel}
        </h1>
        <p className="mt-4 max-w-md text-fumaca">
          {order.status === "CANCELED"
            ? order.cancelReason
            : order.status === "DELIVERED"
              ? `Bom apetite, ${order.firstName}.`
              : order.fulfillment === "DELIVERY"
                ? `Obrigado, ${order.firstName}. Entrega em ${order.address}${order.etaMinutes ? `, em cerca de ${order.etaMinutes} min` : ""}. Esta página atualiza sozinha.`
                : `Obrigado, ${order.firstName}. Avisamos aqui quando estiver pronto para retirar. Esta página atualiza sozinha.`}
        </p>

        {order.status !== "CANCELED" && (
          <ol className="mt-10 flex flex-col" aria-label="Etapas do pedido">
            {order.steps.map((s, i) => {
              const done = i <= currentIdx;
              return (
                <li key={s.status} className="relative grid grid-cols-[2rem_1fr_auto] items-center gap-4 pb-7 last:pb-0" aria-current={i === currentIdx ? "step" : undefined}>
                  {i < order.steps.length - 1 && <span aria-hidden className={cn("absolute top-8 bottom-0 left-[0.94rem] w-0.5", i < currentIdx ? "bg-brasa" : "bg-osso/15")} />}
                  <span
                    key={i === currentIdx ? `current-${order.status}` : s.status}
                    className={cn("relative grid size-8 place-items-center rounded-full border-2", done ? "border-brasa bg-brasa text-carvao" : "border-osso/25", i === currentIdx && "badge-pop")}
                  >
                    {done && <Check className="size-4" aria-hidden />}
                  </span>
                  <span className={cn("font-medium", !done && "text-fumaca")}>{s.label}</span>
                  <span className="tabular text-sm text-fumaca">{s.at ? time(s.at) : ""}</span>
                </li>
              );
            })}
          </ol>
        )}

        {awaitingOnline && order.payment?.pixQrCode && (
          <div className="mt-10 rounded-3xl bg-fuligem p-6">
            <h2 className="font-semibold">Pague com Pix para a cozinha começar</h2>
            {order.payment.pixQrCodeBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${order.payment.pixQrCodeBase64}`} alt="QR Code Pix" className="mt-4 size-52 rounded-xl bg-white p-2" />
            )}
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(order.payment!.pixQrCode!).catch(() => {});
                setCopied(true);
              }}
              className={buttonClass("outline", "md", "mt-4")}
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied ? "Código copiado" : "Copiar código Pix"}
            </button>
            {order.payment.expiresAt && <p className="mt-3 text-sm text-fumaca">Expira às {time(order.payment.expiresAt)}.</p>}
          </div>
        )}
        {awaitingOnline && order.payment?.checkoutUrl && order.paymentMethod === "CARD_ONLINE" && (
          <ButtonLink href={order.payment.checkoutUrl} className="mt-8" size="lg">
            Pagar com cartão no Mercado Pago
          </ButtonLink>
        )}
        {awaitingOnline && (!order.payment || order.payment.status === "FAILED") && (
          <div className="mt-8 rounded-3xl bg-fuligem p-6">
            <p>{order.payment?.status === "FAILED" ? "O pagamento foi recusado." : "O pagamento ainda não foi iniciado."}</p>
            <Button className="mt-4" onClick={() => act("pay")} disabled={busy}>
              Tentar pagamento novamente
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-6 text-sm text-[#ff8a70]" role="alert">
            {error}
          </p>
        )}
        {order.canCancel && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Cancelar este pedido?")) act("cancel");
            }}
            disabled={busy}
            className={buttonClass("ghost", "md", "mt-8 text-fumaca")}
            data-testid="cancel-order"
          >
            <X className="size-4" aria-hidden /> Cancelar pedido
          </button>
        )}
      </div>

      <section className="ticket rounded-sm px-6 sm:px-9" aria-label="Comanda do pedido">
        <div className="flex items-baseline justify-between">
          <p className="display text-3xl">Black Smoke</p>
          <p className="display text-5xl">#{order.number}</p>
        </div>
        <p className="mt-1 text-sm text-tinta/70">
          {new Date(order.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })} ·{" "}
          {order.fulfillment === "DELIVERY" ? "Entrega" : "Retirada"}
        </p>
        <ul className="ticket-rule mt-5 flex flex-col gap-4 pt-5">
          {order.items.map((i, idx) => (
            <li key={idx}>
              <div className="flex justify-between gap-3 font-semibold">
                <span>
                  {i.quantity}× {i.name}
                </span>
                <span className="tabular">{formatBRL(i.lineTotalCents)}</span>
              </div>
              <p className="text-sm text-tinta/75">
                {[i.doneness && DONENESS[i.doneness], ...i.options.map((o) => `+ ${o}`), ...i.removed.map((r) => `sem ${r.toLowerCase()}`), i.notes && `“${i.notes}”`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
        <dl className="tabular ticket-rule mt-5 flex flex-col gap-1.5 pt-5 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(order.subtotalCents)}</dd></div>
          {order.discountCents > 0 && <div className="flex justify-between"><dt>Desconto {order.couponCode}</dt><dd>− {formatBRL(order.discountCents)}</dd></div>}
          {order.fulfillment === "DELIVERY" && <div className="flex justify-between"><dt>Entrega</dt><dd>{formatBRL(order.deliveryFeeCents)}</dd></div>}
          <div className="mt-2 flex items-baseline justify-between"><dt className="font-semibold">Total</dt><dd className="display text-4xl">{formatBRL(order.totalCents)}</dd></div>
        </dl>
        <p className="ticket-rule mt-5 pt-4 text-sm">
          {PAYMENT_LABEL[order.paymentMethod]} · <strong>{PAYMENT_STATUS[order.paymentStatus]}</strong>
          {order.changeForCents ? ` · troco para ${formatBRL(order.changeForCents)}` : ""}
        </p>
      </section>
    </div>
  );
}
