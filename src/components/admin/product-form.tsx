"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { parseBRL } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { api } from "./api";

import type { Values, ProductFormData } from "./product-values";

export function ProductForm({ product, categories }: { product?: ProductFormData; categories: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { register, control, handleSubmit, setValue, formState } = useForm<Values>({
    defaultValues: product?.values ?? {
      name: "", slug: "", tagline: "", description: "", price: "", imageUrl: "", categoryId: categories[0]?.id ?? "",
      isPopular: false, isAvailable: true, allowsDoneness: false, sortOrder: 0, ingredients: [], options: [],
    },
  });
  const ing = useFieldArray({ control, name: "ingredients" });
  const opt = useFieldArray({ control, name: "options" });
  const imageUrl = useWatch({ control, name: "imageUrl" });

  const onSubmit = async (v: Values) => {
    setError(null);
    const priceCents = parseBRL(v.price);
    if (!Number.isFinite(priceCents) || priceCents <= 0) return setError("Preço inválido.");
    const options = v.options.map((o) => ({ ...o, priceCents: parseBRL(o.price), maxQuantity: Number(o.maxQuantity) }));
    if (options.some((o) => !Number.isFinite(o.priceCents))) return setError("Preço de adicional inválido.");
    const payload = {
      name: v.name, slug: v.slug, tagline: v.tagline || null, description: v.description, priceCents, imageUrl: v.imageUrl, categoryId: v.categoryId,
      isPopular: v.isPopular, isAvailable: v.isAvailable, allowsDoneness: v.allowsDoneness, sortOrder: Number(v.sortOrder),
      ingredients: v.ingredients, options: options.map(({ price: _p, ...o }) => o),
    };
    try {
      if (product?.id) await api(`/api/admin/products/${product.id}`, "PATCH", payload);
      else await api("/api/admin/products", "POST", payload);
      router.push("/admin/produtos");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await api<{ url: string }>("/api/admin/uploads", "POST", fd);
      setValue("imageUrl", url, { shouldDirty: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 xl:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" required {...register("name", { onChange: (e) => !product && setValue("slug", slugify(e.target.value)) })} />
          <Field label="Slug (URL)" required {...register("slug")} hint="Letras minúsculas, números e hífens" />
          <Field label="Chamada curta" {...register("tagline")} className="sm:col-span-2" />
        </div>
        <TextArea label="Descrição" required rows={4} {...register("description")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Preço (R$)" inputMode="decimal" required placeholder="38,90" {...register("price")} />
          <Select label="Categoria" {...register("categoryId")}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Field label="Ordem" type="number" min={0} {...register("sortOrder", { valueAsNumber: true })} />
        </div>
        <div className="flex flex-wrap gap-6">
          {(["isAvailable", "isPopular", "allowsDoneness"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" {...register(k)} className="size-5 accent-[var(--color-brasa)]" />
              {k === "isAvailable" ? "Disponível" : k === "isPopular" ? "Mais pedido (destaque)" : "Aceita ponto da carne"}
            </label>
          ))}
        </div>

        <fieldset className="rounded-3xl bg-fuligem p-5">
          <legend className="px-1 font-semibold">Ingredientes</legend>
          <ul className="mt-2 flex flex-col gap-2">
            {ing.fields.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3">
                <input aria-label={`Ingrediente ${i + 1}`} {...register(`ingredients.${i}.name`)} className="h-10 min-w-0 flex-1 rounded-xl border border-osso/15 bg-carvao px-3" />
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" {...register(`ingredients.${i}.removable`)} /> removível</label>
                <button type="button" aria-label="Remover ingrediente" onClick={() => ing.remove(i)} className="p-2 text-fumaca hover:text-osso"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => ing.append({ name: "", removable: true })}><Plus className="size-4" /> Ingrediente</Button>
        </fieldset>

        <fieldset className="rounded-3xl bg-fuligem p-5">
          <legend className="px-1 font-semibold">Adicionais</legend>
          <ul className="mt-2 flex flex-col gap-2">
            {opt.fields.map((f, i) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3">
                <input aria-label={`Adicional ${i + 1}`} {...register(`options.${i}.name`)} className="h-10 min-w-40 flex-1 rounded-xl border border-osso/15 bg-carvao px-3" />
                <input aria-label="Preço do adicional" inputMode="decimal" {...register(`options.${i}.price`)} className="h-10 w-24 rounded-xl border border-osso/15 bg-carvao px-3" />
                <label className="flex items-center gap-1.5 text-sm">máx <input type="number" min={1} max={10} {...register(`options.${i}.maxQuantity`, { valueAsNumber: true })} className="h-10 w-16 rounded-xl border border-osso/15 bg-carvao px-2" /></label>
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" {...register(`options.${i}.active`)} /> ativo</label>
                <button type="button" aria-label="Remover adicional" onClick={() => opt.remove(i)} className="p-2 text-fumaca hover:text-osso"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => opt.append({ name: "", price: "0,00", maxQuantity: 1, active: true })}><Plus className="size-4" /> Adicional</Button>
        </fieldset>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-fuligem">
          {imageUrl ? <Image src={imageUrl} alt="Pré-visualização" fill sizes="22rem" className="object-cover" /> : <p className="grid h-full place-items-center text-fumaca">Sem imagem</p>}
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-osso/30 px-5 py-3 text-sm font-semibold hover:border-osso has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brasa">
          <Upload className="size-4" aria-hidden /> {uploading ? "Enviando…" : "Enviar imagem (JPG, PNG, WebP · até 5 MB)"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        <Field label="ou caminho da imagem" {...register("imageUrl")} placeholder="/images/products/..." />
        {error && <p role="alert" className="rounded-xl bg-sangue/25 p-3 text-sm" data-testid="product-form-error">{error}</p>}
        <Button type="submit" size="lg" disabled={formState.isSubmitting || uploading}>{product?.id ? "Salvar alterações" : "Criar produto"}</Button>
        {product?.id && (
          <Button
            variant="ghost"
            onClick={async () => {
              if (!confirm("Excluir este produto? Ele sai do cardápio, mas continua nos pedidos antigos.")) return;
              try {
                await api(`/api/admin/products/${product.id}`, "DELETE");
                router.push("/admin/produtos");
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Trash2 className="size-4" /> Excluir produto
          </Button>
        )}
      </div>
    </form>
  );
}
