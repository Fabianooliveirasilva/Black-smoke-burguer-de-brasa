"use client";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { formatBRL, parseBRL } from "@/lib/money";
import { api } from "./api";
import { Switch } from "./switch";

interface Zone { id: string; name: string; neighborhoods: string[]; feeCents: number; etaMinutes: number; active: boolean }

export function ZoneManager({ zones }: { zones: Zone[] }) {
  const [confirmDialog, dialog] = useConfirm();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: "", neighborhoods: "", fee: "", eta: 40 } });
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  return (
    <section className="rounded-3xl bg-fuligem p-6" aria-labelledby="zonas">
      {dialog}
      <h2 id="zonas" className="display text-3xl">Áreas de entrega</h2>
      <ul className="mt-4 divide-y divide-osso/8">
        {zones.map((z) => (
          <li key={z.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-semibold">{z.name} · {formatBRL(z.feeCents)} · ~{z.etaMinutes} min</p>
              <p className="text-sm text-fumaca">{z.neighborhoods.join(", ")}</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch label={`Zona ${z.name} ativa`} checked={z.active} onChange={(v) => run(() => api(`/api/admin/delivery-zones/${z.id}`, "PATCH", { active: v }))} />
              <button type="button" className="text-sm text-fumaca underline hover:text-osso" onClick={async () => (await confirmDialog({ title: `Excluir ${z.name}?`, body: "Bairros desta área deixam de receber entregas.", confirmLabel: "Excluir área" })) && run(() => api(`/api/admin/delivery-zones/${z.id}`, "DELETE"))}>Excluir</button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-6 grid gap-3 sm:grid-cols-[1fr_2fr_8rem_7rem_auto] sm:items-end"
        onSubmit={handleSubmit(async (v) => {
          const ok = await run(() =>
            api("/api/admin/delivery-zones", "POST", {
              name: v.name,
              neighborhoods: v.neighborhoods.split(",").map((s) => s.trim()).filter(Boolean),
              feeCents: parseBRL(v.fee || "0"),
              etaMinutes: Number(v.eta),
              sortOrder: zones.length,
            }),
          );
          if (ok) reset();
        })}
      >
        <Field label="Nome" {...register("name")} />
        <Field label="Bairros (separados por vírgula)" {...register("neighborhoods")} />
        <Field label="Taxa (R$)" inputMode="decimal" {...register("fee")} />
        <Field label="Tempo (min)" type="number" {...register("eta")} />
        <Button type="submit" className="h-12">Adicionar</Button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-[#ff8a70]">{error}</p>}
    </section>
  );
}
