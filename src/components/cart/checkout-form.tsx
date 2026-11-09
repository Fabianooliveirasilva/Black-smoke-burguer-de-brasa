"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Banknote, CreditCard, QrCode, Smartphone } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { useMounted } from "@/hooks/use-mounted";
import { formatBRL, parseBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CheckoutConfig } from "@/server/checkout-config";
import { toLineInput, useCart } from "./cart-store";
import { TotalsRows } from "./cart-summary";
import { useQuote } from "./use-quote";

interface SavedAddress {
  id: string;
  label: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  cep: string;
  reference: string;
}
interface Profile {
  name: string;
  email: string;
  phone: string;
  addresses: SavedAddress[];
}

const formSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome").max(80),
    phone: z.string().refine((v) => /^[1-9]{2}9?\d{8}$/.test(v.replace(/\D/g, "")), "Telefone com DDD, ex.: (11) 91234-5678"),
    email: z.string().trim().max(120).refine((v) => !v || z.string().email().safeParse(v).success, "E-mail inválido"),
    cep: z.string(),
    street: z.string().trim().max(120),
    number: z.string().trim().max(20),
    complement: z.string().trim().max(80),
    neighborhood: z.string(),
    reference: z.string().trim().max(120),
    paymentMethod: z.enum(["PIX", "CARD_ONLINE", "CARD_ON_DELIVERY", "CASH"]),
    changeFor: z.string(),
    notes: z.string().trim().max(300),
    delivery: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.delivery) {
      if (!/^\d{8}$/.test(v.cep.replace(/\D/g, ""))) ctx.addIssue({ code: "custom", path: ["cep"], message: "CEP com 8 dígitos" });
      if (!v.street) ctx.addIssue({ code: "custom", path: ["street"], message: "Informe a rua" });
      if (!v.number) ctx.addIssue({ code: "custom", path: ["number"], message: "Informe o número" });
      if (!v.neighborhood) ctx.addIssue({ code: "custom", path: ["neighborhood"], message: "Escolha o bairro" });
    }
    if (v.paymentMethod === "PIX" && !v.email) ctx.addIssue({ code: "custom", path: ["email"], message: "Para Pix, informe um e-mail" });
    if (v.paymentMethod === "CASH" && v.changeFor && Number.isNaN(parseBRL(v.changeFor))) {
      ctx.addIssue({ code: "custom", path: ["changeFor"], message: "Valor inválido" });
    }
  });
type FormValues = z.infer<typeof formSchema>;

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};
const maskCep = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

export function CheckoutForm({ config, profile }: { config: CheckoutConfig; profile: Profile | null }) {
  const mounted = useMounted();
  const router = useRouter();
  const cart = useCart();
  const { quote } = useQuote();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const delivery = (config.deliveryEnabled && cart.fulfillment === "DELIVERY") || !config.pickupEnabled;
  const zone = config.zones.find((z) => z.id === cart.deliveryZoneId);
  const firstAddr = profile?.addresses.find((a) => zone?.neighborhoods.includes(a.neighborhood));

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: profile?.name ?? "",
      phone: profile?.phone ? maskPhone(profile.phone) : "",
      email: profile?.email ?? "",
      cep: firstAddr ? maskCep(firstAddr.cep) : "",
      street: firstAddr?.street ?? "",
      number: firstAddr?.number ?? "",
      complement: firstAddr?.complement ?? "",
      neighborhood: firstAddr?.neighborhood ?? "",
      reference: firstAddr?.reference ?? "",
      paymentMethod: "CARD_ON_DELIVERY",
      changeFor: "",
      notes: "",
      delivery,
    },
  });
  const payment = useWatch({ control, name: "paymentMethod" });

  if (!mounted) return <div className="mt-10 h-[40svh] animate-pulse rounded bg-fuligem/60" />;
  if (cart.items.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-start gap-6">
        <p className="text-lg text-fumaca">Não há itens no seu pedido.</p>
        <ButtonLink href="/cardapio">Abrir o cardápio</ButtonLink>
      </div>
    );
  }
  if (delivery && !zone) {
    return (
      <div className="mt-10 flex flex-col items-start gap-6">
        <p className="text-lg text-fumaca">Escolha a região de entrega no seu pedido antes de continuar.</p>
        <ButtonLink href="/carrinho">Voltar ao pedido</ButtonLink>
      </div>
    );
  }

  const onSubmit = async (v: FormValues) => {
    setSubmitError(null);
    const payload = {
      customer: { name: v.name, phone: v.phone, email: v.email || "" },
      items: cart.items.map(toLineInput),
      paymentMethod: v.paymentMethod,
      changeForCents: v.paymentMethod === "CASH" && v.changeFor ? parseBRL(v.changeFor) : null,
      couponCode: cart.couponCode,
      notes: v.notes || null,
      ...(delivery
        ? {
            fulfillment: "DELIVERY" as const,
            deliveryZoneId: zone!.id,
            address: { street: v.street, number: v.number, complement: v.complement || null, neighborhood: v.neighborhood, city: "São Paulo", cep: v.cep, reference: v.reference || null },
          }
        : { fulfillment: "PICKUP" as const }),
    };
    const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setSubmitError(data?.error?.message ?? "Não foi possível enviar o pedido. Tente novamente.");
      return;
    }
    cart.clear();
    router.push(`/pedido/${data.trackingToken}`);
  };

  const methods = [
    ...(config.onlinePayments
      ? [
          { value: "PIX", label: "Pix", hint: "QR Code na próxima tela", icon: QrCode },
          { value: "CARD_ONLINE", label: "Cartão online", hint: "Mercado Pago", icon: CreditCard },
        ]
      : []),
    { value: "CARD_ON_DELIVERY", label: delivery ? "Cartão na entrega" : "Cartão no balcão", hint: "Débito ou crédito", icon: Smartphone },
    { value: "CASH", label: "Dinheiro", hint: delivery ? "Levamos troco" : "No balcão", icon: Banknote },
  ] as const;

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="flex flex-col gap-12">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="display mb-4 text-4xl">Quem pede</legend>
          <Field label="Nome" autoComplete="name" {...register("name")} error={errors.name?.message} className="sm:col-span-2" />
          <Field
            label="Celular"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            {...register("phone", { onChange: (e) => setValue("phone", maskPhone(e.target.value)) })}
            error={errors.phone?.message}
            hint="Usamos só para falar sobre este pedido."
          />
          <Field label={payment === "PIX" ? "E-mail" : "E-mail (opcional)"} type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
          {!profile && (
            <p className="text-sm text-fumaca sm:col-span-2">
              Tem conta?{" "}
              <Link href="/entrar?next=/checkout" className="text-osso underline underline-offset-4">
                Entre
              </Link>{" "}
              para usar endereços salvos e ver o histórico.
            </p>
          )}
        </fieldset>

        {delivery ? (
          <fieldset className="grid gap-4 sm:grid-cols-6">
            <legend className="display mb-4 text-4xl">Onde entregar</legend>
            {profile && profile.addresses.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:col-span-6">
                {profile.addresses.map((a) => {
                  const served = zone!.neighborhoods.includes(a.neighborhood);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={!served}
                      title={served ? undefined : "Fora da região escolhida"}
                      onClick={() => {
                        setValue("cep", maskCep(a.cep));
                        setValue("street", a.street);
                        setValue("number", a.number);
                        setValue("complement", a.complement);
                        setValue("neighborhood", a.neighborhood);
                        setValue("reference", a.reference);
                      }}
                      className="rounded-full border border-osso/20 px-4 py-2 text-sm hover:border-osso disabled:opacity-40"
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            )}
            <Field label="CEP" inputMode="numeric" autoComplete="postal-code" {...register("cep", { onChange: (e) => setValue("cep", maskCep(e.target.value)) })} error={errors.cep?.message} className="sm:col-span-2" />
            <Select label="Bairro" {...register("neighborhood")} error={errors.neighborhood?.message} className="sm:col-span-4">
              <option value="">Selecione</option>
              {zone!.neighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            <Field label="Rua" autoComplete="address-line1" {...register("street")} error={errors.street?.message} className="sm:col-span-4" />
            <Field label="Número" {...register("number")} error={errors.number?.message} className="sm:col-span-2" />
            <Field label="Complemento" autoComplete="address-line2" {...register("complement")} className="sm:col-span-3" />
            <Field label="Ponto de referência" {...register("reference")} className="sm:col-span-3" />
            <p className="text-sm text-fumaca sm:col-span-6">
              Região {zone!.name}: taxa {formatBRL(zone!.feeCents)}, cerca de {zone!.etaMinutes} minutos.{" "}
              <Link href="/carrinho" className="underline underline-offset-4">
                Trocar região
              </Link>
            </p>
          </fieldset>
        ) : (
          <div>
            <h2 className="display text-4xl">Retirada</h2>
            <p className="mt-3 text-fumaca">
              {config.pickupAddress}. Avisamos pela página do pedido quando estiver pronto (cerca de {config.prepTimeMinutes} min).
            </p>
          </div>
        )}

        <fieldset>
          <legend className="display mb-4 text-4xl">Pagamento</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {methods.map((m) => (
              <label
                key={m.value}
                className={cn(
                  "flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brasa",
                  payment === m.value ? "border-brasa bg-brasa/10" : "border-osso/15 hover:border-osso/40",
                )}
              >
                <input type="radio" value={m.value} {...register("paymentMethod")} className="sr-only" />
                <m.icon className="size-6 shrink-0 text-brasa" aria-hidden />
                <span>
                  <span className="block font-semibold">{m.label}</span>
                  <span className="text-sm text-fumaca">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {!config.onlinePayments && <p className="mt-3 text-sm text-fumaca">Pagamento online temporariamente indisponível. Pague na entrega ou no balcão.</p>}
          {payment === "CASH" && (
            <Field label="Troco para quanto? (opcional)" inputMode="decimal" placeholder="Ex.: 100,00" {...register("changeFor")} error={errors.changeFor?.message} className="mt-4 max-w-xs" />
          )}
        </fieldset>

        <TextArea label="Observações do pedido (opcional)" placeholder="Ex.: interfone quebrado, ligar ao chegar" maxLength={300} {...register("notes")} />
      </div>

      <aside className="ticket rounded-sm px-6 sm:px-8 lg:sticky lg:top-28" aria-label="Resumo">
        <p className="display text-3xl">Resumo</p>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {cart.items.map((i, idx) => (
            <li key={i.key} className="flex justify-between gap-3">
              <span>
                {i.quantity}× {i.name}
              </span>
              <span className="tabular">{formatBRL(quote?.lines.find((l) => l.index === idx)?.lineTotalCents ?? 0)}</span>
            </li>
          ))}
        </ul>
        <div className="ticket-rule mt-5 pt-4">
          <TotalsRows quote={quote} fulfillment={delivery ? "DELIVERY" : "PICKUP"} zoneChosen={!!zone} />
        </div>
        {submitError && (
          <p className="mt-4 rounded-xl bg-sangue/15 p-3 text-sm font-medium text-sangue" role="alert" data-testid="checkout-error">
            {submitError}
          </p>
        )}
        {!config.open && <p className="mt-4 text-sm font-semibold text-sangue">{config.closedReason}</p>}
        <Button type="submit" variant="ink" size="lg" className="mt-6 w-full" disabled={isSubmitting || !config.open || !quote} data-testid="place-order">
          {isSubmitting ? "Enviando…" : `Confirmar pedido${quote ? ` · ${formatBRL(quote.totalCents)}` : ""}`}
        </Button>
        <p className="mt-3 text-center text-xs text-tinta/70">Valores conferidos pela loja no envio.</p>
      </aside>
    </form>
  );
}
