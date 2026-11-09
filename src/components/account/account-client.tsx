"use client";
import { HydrationGate } from "@/components/ui/hydration-gate";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

interface Address {
  id: string;
  label: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  cep: string;
  reference: string | null;
  isDefault: boolean;
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.details?.[0]?.message ?? data?.error?.message ?? "Erro ao salvar.");
  }
}

export function AccountClient({ profile, addresses, isAdmin }: { profile: { name: string; email: string; phone: string }; addresses: Address[]; isAdmin: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const p = useForm({ defaultValues: { name: profile.name, phone: profile.phone } });
  const a = useForm({ defaultValues: { label: "Casa", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "São Paulo", reference: "" } });

  return (
    <div className="flex flex-col gap-12">
      <HydrationGate>
      <section aria-labelledby="perfil">
        <h2 id="perfil" className="display text-4xl">Dados</h2>
        <p className="mt-2 text-sm text-fumaca">{profile.email}</p>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={p.handleSubmit(async (v) => {
            try {
              await send("/api/me", "PATCH", { name: v.name, phone: v.phone || null });
              setMsg("Dados salvos.");
              router.refresh();
            } catch (e) {
              setMsg((e as Error).message);
            }
          })}
        >
          <Field label="Nome" {...p.register("name")} />
          <Field label="Celular" type="tel" {...p.register("phone")} />
          <Button type="submit" variant="outline" className="self-start">
            Salvar dados
          </Button>
        </form>
        {msg && <p className="mt-3 text-sm text-fumaca" role="status">{msg}</p>}
      </section>

      <section aria-labelledby="enderecos">
        <h2 id="enderecos" className="display text-4xl">Endereços</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {addresses.map((ad) => (
            <li key={ad.id} className="flex items-start justify-between gap-4 rounded-2xl bg-fuligem p-4">
              <div>
                <p className="font-semibold">
                  {ad.label} {ad.isDefault && <span className="text-xs text-brasa">· principal</span>}
                </p>
                <p className="text-sm text-fumaca">
                  {ad.street}, {ad.number}
                  {ad.complement ? ` — ${ad.complement}` : ""} · {ad.neighborhood}
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-fumaca underline hover:text-osso"
                onClick={async () => {
                  await send(`/api/me/addresses/${ad.id}`, "DELETE");
                  router.refresh();
                }}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
        {adding ? (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={a.handleSubmit(async (v) => {
              try {
                await send("/api/me/addresses", "POST", { ...v, complement: v.complement || null, reference: v.reference || null });
                a.reset();
                setAdding(false);
                router.refresh();
              } catch (e) {
                setMsg((e as Error).message);
              }
            })}
          >
            <Field label="Apelido" {...a.register("label")} />
            <Field label="CEP" inputMode="numeric" {...a.register("cep")} />
            <Field label="Rua" {...a.register("street")} className="sm:col-span-2" />
            <Field label="Número" {...a.register("number")} />
            <Field label="Complemento" {...a.register("complement")} />
            <Field label="Bairro" {...a.register("neighborhood")} />
            <Field label="Cidade" {...a.register("city")} />
            <Field label="Referência" {...a.register("reference")} className="sm:col-span-2" />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">Salvar endereço</Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" className="mt-4" onClick={() => setAdding(true)}>
            Adicionar endereço
          </Button>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        {isAdmin && (
          <Link href="/admin" className={buttonClass("primary")}>
            Painel administrativo
          </Link>
        )}
        <Button
          variant="ghost"
          onClick={async () => {
            await authClient.signOut();
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload after sign-out
            window.location.assign("/");
          }}
        >
          Sair da conta
        </Button>
      </div>
      </HydrationGate>
    </div>
  );
}
