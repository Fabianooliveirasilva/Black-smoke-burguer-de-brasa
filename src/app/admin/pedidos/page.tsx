import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { adminOrdersQuery } from "@/schemas/order";
import { listOrders } from "@/server/admin";
import { STATUS_LABEL } from "@/server/order-status";
import { formatBRL } from "@/lib/money";
import { StatusBadge } from "@/components/admin/status-badge";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Pedidos" };

const PAY = { PIX: "Pix", CARD_ONLINE: "Cartão online", CARD_ON_DELIVERY: "Cartão entrega", CASH: "Dinheiro" } as const;
const input = "h-10 rounded-xl border border-osso/15 bg-carvao px-3 text-sm focus:border-brasa focus:outline-none";

export default async function OrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  await requireAdmin();
  const raw = await searchParams;
  const parsed = adminOrdersQuery.safeParse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v)));
  const q = parsed.success ? parsed.data : adminOrdersQuery.parse({});
  const { orders, total, page, pageSize } = await listOrders(q);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const qs = (p: number) => new URLSearchParams({ ...Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])), page: String(p) }).toString();

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={20} />
      <h1 className="display text-6xl">Pedidos</h1>
      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="flex flex-col gap-1 text-xs text-fumaca">
          Status
          <select name="status" defaultValue={q.status ?? ""} className={input}>
            <option value="">Todos</option>
            <option value="ACTIVE">Em andamento</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-fumaca">De<input type="date" name="from" defaultValue={q.from} className={input} /></label>
        <label className="flex flex-col gap-1 text-xs text-fumaca">Até<input type="date" name="to" defaultValue={q.to} className={input} /></label>
        <label className="flex flex-col gap-1 text-xs text-fumaca">Busca<input name="q" defaultValue={q.q} placeholder="Nº, nome ou telefone" className={input} /></label>
        <button className={buttonClass("primary", "sm", "h-10")}>Filtrar</button>
        <Link href="/admin/pedidos" className={buttonClass("ghost", "sm", "h-10")}>Limpar</Link>
      </form>
      <p className="text-sm text-fumaca">{total} pedido(s)</p>
      <div className="overflow-x-auto rounded-3xl bg-fuligem">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="text-fumaca">
            <tr className="border-b border-osso/10">
              <th className="px-5 py-3 font-medium">Nº</th><th className="px-3 py-3 font-medium">Cliente</th><th className="px-3 py-3 font-medium">Quando</th>
              <th className="px-3 py-3 font-medium">Tipo</th><th className="px-3 py-3 font-medium">Pagamento</th><th className="px-3 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-osso/6 last:border-0 hover:bg-osso/4" data-testid="admin-order-row">
                <td className="px-5 py-3 font-semibold"><Link href={`/admin/pedidos/${o.id}`} className="hover:text-brasa">#{o.number}</Link></td>
                <td className="px-3 py-3">{o.customerName}</td>
                <td className="px-3 py-3 text-fumaca">{o.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</td>
                <td className="px-3 py-3">{o.fulfillment === "DELIVERY" ? `Entrega · ${o.neighborhood}` : "Retirada"}</td>
                <td className="px-3 py-3">{PAY[o.paymentMethod]} · <span className={o.paymentStatus === "PAID" ? "text-osso" : "text-fumaca"}>{o.paymentStatus === "PAID" ? "pago" : o.paymentStatus === "PENDING" ? "pendente" : o.paymentStatus.toLowerCase()}</span></td>
                <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-5 py-3 text-right">{formatBRL(o.totalCents)}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-fumaca">Nenhum pedido com esses filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Paginação" className="flex items-center gap-3 text-sm">
          {page > 1 && <Link href={`?${qs(page - 1)}`} className={buttonClass("outline", "sm")}>Anterior</Link>}
          <span className="text-fumaca">Página {page} de {pages}</span>
          {page < pages && <Link href={`?${qs(page + 1)}`} className={buttonClass("outline", "sm")}>Próxima</Link>}
        </nav>
      )}
    </div>
  );
}
