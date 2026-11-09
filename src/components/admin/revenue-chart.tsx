"use client";
import { useState } from "react";
import { formatBRL } from "@/lib/money";
import { plural } from "@/lib/format";

/** Single-series daily revenue bars (one hue; tooltip per bar; table view for AT). */
export function RevenueChart({ data }: { data: Array<{ day: string; orders: number; revenueCents: number }> }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.revenueCents));
  const label = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

  return (
    <figure className="rounded-3xl bg-fuligem p-6">
      <div className="flex items-baseline justify-between gap-4">
        <figcaption className="font-semibold">Faturamento por dia · 14 dias</figcaption>
        <button type="button" onClick={() => setTable((t) => !t)} className="text-sm text-fumaca underline underline-offset-4 hover:text-osso">
          {table ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>
      {data.length === 0 ? (
        <p className="mt-6 text-fumaca">Sem pedidos no período.</p>
      ) : table ? (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-fumaca">
            <tr><th className="py-1 font-medium">Dia</th><th className="py-1 text-right font-medium">Pedidos</th><th className="py-1 text-right font-medium">Faturamento</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day} className="border-t border-osso/8"><td className="py-1.5">{label(d.day)}</td><td className="py-1.5 text-right">{d.orders}</td><td className="py-1.5 text-right">{formatBRL(d.revenueCents)}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative mt-6">
          <div className="flex h-48 items-end gap-[2px] border-b border-osso/15" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <button
                key={d.day}
                type="button"
                aria-label={`${label(d.day)}: ${formatBRL(d.revenueCents)}, ${plural(d.orders, "pedido", "pedidos")}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="group flex h-full flex-1 items-end focus-visible:outline-offset-0"
              >
                <span
                  className="block w-full rounded-t-[4px] bg-brasa transition-opacity group-hover:opacity-80"
                  style={{ height: `${Math.max(2, (d.revenueCents / max) * 100)}%`, opacity: hover !== null && hover !== i ? 0.45 : 1 }}
                />
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-fumaca">
            <span>{label(data[0].day)}</span>
            <span>{label(data[data.length - 1].day)}</span>
          </div>
          {hover !== null && (
            <div
              role="status"
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-carvao px-3 py-2 text-xs shadow-lg ring-1 ring-osso/15"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <p className="font-semibold">{label(data[hover].day)}</p>
              <p>{formatBRL(data[hover].revenueCents)}</p>
              <p className="text-fumaca">{plural(data[hover].orders, "pedido", "pedidos")}</p>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
