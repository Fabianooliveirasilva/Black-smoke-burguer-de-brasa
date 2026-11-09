"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import { useAdoptTypedValue } from "@/hooks/use-adopt-typed-value";
import { useMounted } from "@/hooks/use-mounted";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { useCart, type CartItem } from "@/components/cart/cart-store";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MenuProduct } from "@/server/catalog";
import type { Doneness } from "@/server/pricing";

export const DONENESS: Array<{ value: Doneness; label: string; hint: string }> = [
  { value: "RARE", label: "Mal passado", hint: "Centro vermelho e quente" },
  { value: "MEDIUM", label: "Ao ponto", hint: "Rosado no centro (recomendado)" },
  { value: "WELL_DONE", label: "Bem passado", hint: "Sem rosado" },
];

export function ProductCustomizer({ product }: { product: MenuProduct }) {
  const search = useSearchParams();
  const editKey = search.get("editar");
  const existing = useCart((s) => (editKey ? s.items.find((i) => i.key === editKey) : undefined));
  return <CustomizerForm key={existing?.key ?? "new"} product={product} existing={existing} />;
}

function CustomizerForm({ product, existing }: { product: MenuProduct; existing?: CartItem }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const update = useCart((s) => s.update);
  const [doneness, setDoneness] = useState<Doneness>(existing?.doneness ?? "MEDIUM");
  const [extras, setExtras] = useState<Record<string, number>>(() => Object.fromEntries((existing?.options ?? []).map((o) => [o.optionId, o.quantity])));
  const [removed, setRemoved] = useState<string[]>(existing?.removedIngredientIds ?? []);
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useMounted();
  useAdoptTypedValue(notesRef, notes, setNotes);
  const [added, setAdded] = useState(false);

  const options = product.options
    .filter((o) => (extras[o.id] ?? 0) > 0)
    .map((o) => ({ optionId: o.id, name: o.name, priceCents: o.priceCents, quantity: extras[o.id] }));
  const unit = product.priceCents + options.reduce((s, o) => s + o.priceCents * o.quantity, 0);
  const removable = product.ingredients.filter((i) => i.removable);

  const submit = () => {
    const item = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.imageUrl,
      basePriceCents: product.priceCents,
      quantity,
      options,
      removedIngredientIds: removed,
      removedNames: product.ingredients.filter((i) => removed.includes(i.id)).map((i) => i.name),
      doneness: product.allowsDoneness ? doneness : null,
      notes: notes.trim().slice(0, 200),
    };
    if (existing) {
      update(existing.key, item);
      router.push("/carrinho");
      return;
    }
    add(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 4000);
  };

  return (
    <form
      data-hydrated={mounted}
      className="mt-10 flex flex-col gap-10 border-t border-osso/10 pt-10"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {product.allowsDoneness && (
        <fieldset>
          <legend className="font-semibold">Ponto da carne</legend>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {DONENESS.map((d) => (
              <label
                key={d.value}
                className={cn(
                  "flex cursor-pointer flex-col rounded-2xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brasa",
                  doneness === d.value ? "border-brasa bg-brasa/10" : "border-osso/15 hover:border-osso/40",
                )}
              >
                <input type="radio" name="doneness" value={d.value} checked={doneness === d.value} onChange={() => setDoneness(d.value)} className="sr-only" />
                <span className="font-semibold">{d.label}</span>
                <span className="text-xs text-fumaca">{d.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {product.options.length > 0 && (
        <fieldset>
          <legend className="font-semibold">Adicionais</legend>
          <ul className="mt-2">
            {product.options.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 border-b border-osso/8 py-3">
                <div>
                  <p>{o.name}</p>
                  <p className="tabular text-sm text-fumaca">+ {formatBRL(o.priceCents)}</p>
                </div>
                <Stepper size="sm" label={o.name} value={extras[o.id] ?? 0} max={o.maxQuantity} onChange={(v) => setExtras((s) => ({ ...s, [o.id]: v }))} />
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {removable.length > 0 && (
        <fieldset>
          <legend className="font-semibold">Tirar algum ingrediente?</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {removable.map((i) => {
              const on = removed.includes(i.id);
              return (
                <label
                  key={i.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brasa",
                    on ? "border-sangue bg-sangue/25 line-through decoration-2" : "border-osso/20 hover:border-osso/50",
                  )}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => setRemoved((s) => (on ? s.filter((x) => x !== i.id) : [...s, i.id]))} />
                  {on ? `Sem ${i.name.toLowerCase()}` : i.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="font-semibold">
          Observação para a cozinha
        </label>
        <textarea
          id="notes"
          ref={notesRef}
          value={notes}
          maxLength={200}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: molho à parte"
          className="min-h-20 rounded-2xl border border-osso/15 bg-transparent p-4 placeholder:text-fumaca/70 focus:border-brasa focus:outline-none"
        />
      </div>

      <div className="sticky bottom-3 z-10 flex items-center gap-4 rounded-full border border-osso/10 bg-fuligem/95 p-2 pl-4 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <Stepper label="Quantidade" value={quantity} min={1} max={20} onChange={setQuantity} />
        <Button type="submit" size="lg" className="flex-1 justify-between" disabled={!product.isAvailable} data-testid="add-to-cart">
          <span>{!product.isAvailable ? "Esgotado hoje" : existing ? "Salvar alterações" : "Adicionar"}</span>
          <span className="tabular">{formatBRL(unit * quantity)}</span>
        </Button>
      </div>

      {added && (
          <div role="status" className="sheet-in flex items-center justify-between gap-4 rounded-2xl bg-musgo/20 p-4 text-sm">
            <span className="flex items-center gap-2">
              <Check className="size-4" aria-hidden /> {quantity}× {product.name} no seu pedido.
            </span>
            <Link href="/carrinho" className="font-semibold underline underline-offset-4">
              Ver pedido
            </Link>
          </div>
      )}
    </form>
  );
}
