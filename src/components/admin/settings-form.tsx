"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { DAY_NAMES, type OpeningWindow } from "@/server/hours";
import { parseBRL } from "@/lib/money";
import { api } from "./api";

interface Settings {
  name: string; phone: string; whatsapp: string; email: string; street: string; neighborhood: string; city: string; state: string; cep: string;
  latitude: number; longitude: number; openingHours: OpeningWindow[]; ordersPaused: boolean; deliveryEnabled: boolean; pickupEnabled: boolean;
  minOrderCents: number; prepTimeMinutes: number;
}
type V = Omit<Settings, "minOrderCents"> & { minOrder: string };

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, control, handleSubmit, formState } = useForm<V>({ defaultValues: { ...initial, minOrder: (initial.minOrderCents / 100).toFixed(2).replace(".", ",") } });
  const hours = useFieldArray({ control, name: "openingHours" });

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={handleSubmit(async ({ minOrder, ...v }) => {
        setMsg(null);
        try {
          await api("/api/admin/settings", "PUT", {
            ...v, latitude: Number(v.latitude), longitude: Number(v.longitude), prepTimeMinutes: Number(v.prepTimeMinutes), minOrderCents: parseBRL(minOrder || "0"),
            openingHours: v.openingHours.map((h) => ({ ...h, day: Number(h.day) })),
          });
          setMsg({ ok: true, text: "Configurações salvas." });
          router.refresh();
        } catch (e) {
          setMsg({ ok: false, text: (e as Error).message });
        }
      })}
    >
      <section className="rounded-3xl bg-fuligem p-6">
        <h2 className="display text-3xl">Operação</h2>
        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" {...register("ordersPaused")} className="size-5 accent-[var(--color-brasa)]" /> Pausar novos pedidos</label>
          <label className="flex items-center gap-2"><input type="checkbox" {...register("deliveryEnabled")} className="size-5" /> Entrega ativa</label>
          <label className="flex items-center gap-2"><input type="checkbox" {...register("pickupEnabled")} className="size-5" /> Retirada ativa</label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Pedido mínimo (R$)" inputMode="decimal" {...register("minOrder")} />
          <Field label="Tempo de preparo (min)" type="number" {...register("prepTimeMinutes", { valueAsNumber: true })} />
        </div>
      </section>

      <section className="rounded-3xl bg-fuligem p-6">
        <h2 className="display text-3xl">Horários</h2>
        <p className="mt-1 text-sm text-fumaca">Horário de São Paulo. Fechamento menor que abertura = vira a meia-noite.</p>
        <ul className="mt-4 flex flex-col gap-2">
          {hours.fields.map((f, i) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3">
              <select aria-label="Dia" {...register(`openingHours.${i}.day`, { valueAsNumber: true })} className="h-10 rounded-xl border border-osso/15 bg-carvao px-3">
                {DAY_NAMES.map((d, n) => <option key={d} value={n}>{d}</option>)}
              </select>
              <input aria-label="Abre" type="time" {...register(`openingHours.${i}.open`)} className="h-10 rounded-xl border border-osso/15 bg-carvao px-3" />
              <span className="text-fumaca">até</span>
              <input aria-label="Fecha" type="time" {...register(`openingHours.${i}.close`)} className="h-10 rounded-xl border border-osso/15 bg-carvao px-3" />
              <button type="button" aria-label="Remover horário" onClick={() => hours.remove(i)} className="p-2 text-fumaca hover:text-osso"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => hours.append({ day: 1, open: "18:00", close: "23:00" })}><Plus className="size-4" /> Horário</Button>
      </section>

      <section className="rounded-3xl bg-fuligem p-6">
        <h2 className="display text-3xl">Dados da hamburgueria</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome" {...register("name")} />
          <Field label="Telefone" {...register("phone")} />
          <Field label="WhatsApp" {...register("whatsapp")} />
          <Field label="E-mail" type="email" {...register("email")} />
          <Field label="Endereço" {...register("street")} />
          <Field label="Bairro" {...register("neighborhood")} />
          <Field label="Cidade" {...register("city")} />
          <Field label="UF" maxLength={2} {...register("state")} />
          <Field label="CEP" {...register("cep")} />
          <Field label="Latitude" inputMode="decimal" {...register("latitude", { valueAsNumber: true })} />
          <Field label="Longitude" inputMode="decimal" {...register("longitude", { valueAsNumber: true })} />
        </div>
      </section>
      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>Salvar configurações</Button>
        {msg && <p role="status" className={msg.ok ? "text-osso" : "text-[#ff8a70]"}>{msg.text}</p>}
      </div>
    </form>
  );
}
