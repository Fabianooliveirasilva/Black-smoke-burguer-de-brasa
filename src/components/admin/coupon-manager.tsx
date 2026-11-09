"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { formatBRL, parseBRL } from "@/lib/money";
import { api } from "./api";
import { Switch } from "./switch";

interface Coupon {
  id: string; code: string; description: string; type: "PERCENT" | "FIXED"; value: number; minOrderCents: number;
  maxUses: number | null; usesCount: number; active: boolean; startsAt: string | null; expiresAt: string | null;
}
interface FormV { code: string; description: string; type: "PERCENT" | "FIXED"; value: string; minOrder: string; maxUses: string; startsAt: string; expiresAt: string }

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, control } = useForm<FormV>({ defaultValues: { type: "PERCENT", minOrder: "0", maxUses: "", value: "", code: "", description: "", startsAt: "", expiresAt: "" } });
  const type = useWatch({ control, name: "type" });
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
    <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
      <div className="overflow-x-auto rounded-3xl bg-fuligem">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-fumaca"><tr className="border-b border-osso/10"><th className="px-5 py-3 font-medium">Código</th><th className="px-3 py-3 font-medium">Desconto</th><th className="px-3 py-3 font-medium">Uso</th><th className="px-3 py-3 font-medium">Validade</th><th className="px-3 py-3 font-medium">Ativo</th><th /></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-osso/6 last:border-0" data-testid="coupon-row">
                <td className="px-5 py-3"><p className="font-semibold">{c.code}</p><p className="text-xs text-fumaca">{c.description}</p></td>
                <td className="px-3 py-3">{c.type === "PERCENT" ? `${c.value}%` : formatBRL(c.value)}{c.minOrderCents ? <span className="block text-xs text-fumaca">mín. {formatBRL(c.minOrderCents)}</span> : null}</td>
                <td className="px-3 py-3">{c.usesCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                <td className="px-3 py-3 text-fumaca">{day(c.startsAt)} → {day(c.expiresAt)}</td>
                <td className="px-3 py-3"><Switch label={`Cupom ${c.code} ativo`} checked={c.active} onChange={(v) => run(() => api(`/api/admin/coupons/${c.id}`, "PATCH", { active: v }))} /></td>
                <td className="px-3 py-3"><button type="button" className="text-fumaca underline hover:text-osso" onClick={() => confirm(`Excluir ${c.code}? Cupons já usados são apenas desativados.`) && run(() => api(`/api/admin/coupons/${c.id}`, "DELETE"))}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="flex flex-col gap-4 rounded-3xl bg-fuligem p-6"
        onSubmit={handleSubmit(async (v) => {
          const value = v.type === "PERCENT" ? Number(v.value) : parseBRL(v.value);
          const ok = await run(() =>
            api("/api/admin/coupons", "POST", {
              code: v.code, description: v.description, type: v.type, value, minOrderCents: parseBRL(v.minOrder || "0"),
              maxUses: v.maxUses ? Number(v.maxUses) : null,
              startsAt: v.startsAt ? new Date(`${v.startsAt}T00:00:00-03:00`).toISOString() : null,
              expiresAt: v.expiresAt ? new Date(`${v.expiresAt}T23:59:59-03:00`).toISOString() : null,
            }),
          );
          if (ok) reset();
        })}
      >
        <h2 className="display text-3xl">Novo cupom</h2>
        <Field label="Código" required {...register("code")} placeholder="BRASA20" />
        <Field label="Descrição" required {...register("description")} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Tipo" {...register("type")}><option value="PERCENT">Percentual</option><option value="FIXED">Valor fixo</option></Select>
          <Field label={type === "PERCENT" ? "Percentual (%)" : "Valor (R$)"} required inputMode="decimal" {...register("value")} />
          <Field label="Pedido mínimo (R$)" inputMode="decimal" {...register("minOrder")} />
          <Field label="Limite de usos" type="number" min={1} {...register("maxUses")} hint="Vazio = ilimitado" />
          <Field label="Início" type="date" {...register("startsAt")} />
          <Field label="Fim" type="date" {...register("expiresAt")} />
        </div>
        {error && <p role="alert" className="text-sm text-[#ff8a70]">{error}</p>}
        <Button type="submit">Criar cupom</Button>
      </form>
    </div>
  );
}
