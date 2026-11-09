import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrder } from "@/server/admin";
import { STATUS_LABEL } from "@/server/order-status";
import { HttpError } from "@/lib/http";
import { formatBRL } from "@/lib/money";
import { formatPhone } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatusActions } from "@/components/admin/status-actions";

export const metadata = { title: "Pedido" };
const DONENESS = { RARE: "mal passado", MEDIUM: "ao ponto", WELL_DONE: "bem passado" } as const;
const PAY = { PIX: "Pix", CARD_ONLINE: "Cartão online (Mercado Pago)", CARD_ON_DELIVERY: "Cartão na entrega", CASH: "Dinheiro" } as const;
const dt = (d: Date) => d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function OrderDetail({ params }: PageProps<"/admin/pedidos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const o = await getAdminOrder(id).catch((e) => {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  });
  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/pedidos" className="text-sm text-fumaca hover:text-osso">← Pedidos</Link>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="display text-6xl">Pedido #{o.number}</h1>
        <StatusBadge status={o.status} />
      </div>
      <StatusActions orderId={o.id} next={o.nextStatuses.map((s) => ({ status: s, label: STATUS_LABEL[s] }))} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-fuligem p-6">
          <h2 className="font-semibold">Itens</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {o.items.map((i) => (
              <li key={i.id}>
                <div className="flex justify-between gap-3"><span className="font-medium">{i.quantity}× {i.productName}</span><span>{formatBRL(i.lineTotalCents)}</span></div>
                <p className="text-sm text-fumaca">
                  {[i.doneness && DONENESS[i.doneness], ...i.options.map((op) => `+ ${op.quantity > 1 ? `${op.quantity}× ` : ""}${op.name}`), ...i.removedIngredients.map((r) => `SEM ${r}`), i.notes && `Obs.: ${i.notes}`].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 flex flex-col gap-1 border-t border-osso/10 pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(o.subtotalCents)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between"><dt>Desconto {o.coupon?.code}</dt><dd>− {formatBRL(o.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt>Entrega</dt><dd>{formatBRL(o.deliveryFeeCents)}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatBRL(o.totalCents)}</dd></div>
          </dl>
          {o.notes && <p className="mt-4 rounded-xl bg-carvao p-3 text-sm">Observação: {o.notes}</p>}
        </section>
        <div className="flex flex-col gap-6">
          <section className="rounded-3xl bg-fuligem p-6 text-sm">
            <h2 className="text-base font-semibold">Cliente</h2>
            <p className="mt-2">{o.customerName}</p>
            <p><a className="underline" href={`tel:+55${o.customerPhone}`}>{formatPhone(o.customerPhone)}</a></p>
            {(o.customerEmail || o.user?.email) && <p className="text-fumaca">{o.customerEmail ?? o.user?.email}</p>}
            <p className="mt-3 font-medium">{o.fulfillment === "DELIVERY" ? `Entrega · ${o.deliveryZone?.name ?? ""}` : "Retirada no balcão"}</p>
            {o.fulfillment === "DELIVERY" && (
              <p className="text-fumaca">
                {o.street}, {o.addressNumber}{o.complement ? ` — ${o.complement}` : ""} · {o.neighborhood} · {o.city} · CEP {o.cep}
                {o.reference ? <><br />Ref.: {o.reference}</> : null}
              </p>
            )}
          </section>
          <section className="rounded-3xl bg-fuligem p-6 text-sm">
            <h2 className="text-base font-semibold">Pagamento</h2>
            <p className="mt-2">{PAY[o.paymentMethod]} · <strong>{o.paymentStatus}</strong>{o.changeForCents ? ` · troco para ${formatBRL(o.changeForCents)}` : ""}</p>
            {o.payments.map((p) => (
              <p key={p.id} className="text-fumaca">MP {p.providerPaymentId ?? "(aguardando)"} · {p.providerStatus ?? p.status} · {formatBRL(p.amountCents)} · {dt(p.createdAt)}</p>
            ))}
          </section>
          <section className="rounded-3xl bg-fuligem p-6 text-sm">
            <h2 className="text-base font-semibold">Histórico</h2>
            <ol className="mt-2 flex flex-col gap-1">
              {o.events.map((e) => (
                <li key={e.id} className="flex justify-between gap-3"><span>{STATUS_LABEL[e.status]}{e.note ? ` — ${e.note}` : ""}</span><span className="text-fumaca">{dt(e.createdAt)}</span></li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
