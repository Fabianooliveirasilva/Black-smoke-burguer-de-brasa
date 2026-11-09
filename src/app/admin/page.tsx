import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { dashboard } from "@/server/admin";
import { formatBRL } from "@/lib/money";
import { formatPercent, plural } from "@/lib/format";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { StatusBadge } from "@/components/admin/status-badge";
import { AutoRefresh } from "@/components/admin/auto-refresh";

export default async function AdminHome() {
  await requireAdmin();
  const d = await dashboard(30);
  const tiles = [
    { label: "Pedidos hoje", value: String(d.today.orders), sub: formatBRL(d.today.revenueCents) },
    { label: "Em andamento", value: String(d.pending), sub: "aguardando a cozinha ou entrega", href: "/admin/pedidos?status=ACTIVE" },
    { label: "Faturamento · 30 dias", value: formatBRL(d.revenueCents), sub: plural(d.orders, "pedido", "pedidos") },
    { label: "Ticket médio", value: formatBRL(d.averageTicketCents), sub: `${formatPercent(d.cancelRate)} cancelados` },
  ];
  const maxQty = Math.max(1, ...d.topProducts.map((p) => p.quantity));
  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh seconds={30} />
      <h1 className="display text-6xl">Painel</h1>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label} className="rounded-3xl bg-fuligem p-6">
            <p className="text-sm text-fumaca">{t.label}</p>
            <p className="display mt-2 text-5xl" data-testid={`kpi-${t.label}`}>{t.value}</p>
            {t.href ? <Link href={t.href} className="mt-1 block text-sm text-fumaca underline underline-offset-4 hover:text-osso">{t.sub}</Link> : <p className="mt-1 text-sm text-fumaca">{t.sub}</p>}
          </li>
        ))}
      </ul>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <RevenueChart data={d.daily} />
        <section className="rounded-3xl bg-fuligem p-6" aria-labelledby="top">
          <h2 id="top" className="font-semibold">Mais vendidos · 30 dias</h2>
          {d.topProducts.length === 0 ? (
            <p className="mt-4 text-fumaca">Sem vendas no período.</p>
          ) : (
            <ol className="mt-4 flex flex-col gap-3">
              {d.topProducts.map((p) => (
                <li key={p.name}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{p.name}</span>
                    <span className="text-fumaca">{p.quantity} un · {formatBRL(p.revenueCents)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-osso/8" aria-hidden>
                    <div className="h-full rounded-full bg-brasa" style={{ width: `${(p.quantity / maxQty) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <section aria-labelledby="recentes">
        <div className="flex items-baseline justify-between">
          <h2 id="recentes" className="display text-4xl">Pedidos recentes</h2>
          <Link href="/admin/pedidos" className="text-sm text-fumaca underline underline-offset-4 hover:text-osso">Todos os pedidos</Link>
        </div>
        <ul className="mt-4 divide-y divide-osso/8 rounded-3xl bg-fuligem px-6">
          {d.recent.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/pedidos/${o.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-brasa">
                <span><span className="font-semibold">#{o.number}</span> · {o.customerName}</span>
                <span className="flex items-center gap-4"><StatusBadge status={o.status} /><span className="hidden sm:inline">{formatBRL(o.totalCents)}</span></span>
              </Link>
            </li>
          ))}
          {d.recent.length === 0 && <li className="py-6 text-fumaca">Nenhum pedido ainda.</li>}
        </ul>
      </section>
    </div>
  );
}
