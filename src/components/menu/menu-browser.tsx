"use client";
import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Flame, Search, X } from "lucide-react";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MenuCategory, MenuProduct } from "@/server/catalog";

type Sort = "relevance" | "price-asc" | "price-desc" | "name";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function MenuBrowser({ categories }: { categories: MenuCategory[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [onlyPopular, setOnlyPopular] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<Sort>("relevance");
  const q = normalize(useDeferredValue(query).trim());

  const groups = useMemo(() => {
    const match = (p: MenuProduct) =>
      (!q || normalize(`${p.name} ${p.tagline ?? ""} ${p.description} ${p.ingredients.map((i) => i.name).join(" ")}`).includes(q)) &&
      (!onlyPopular || p.isPopular) &&
      (!onlyAvailable || p.isAvailable);
    const sorter = (a: MenuProduct, b: MenuProduct) =>
      sort === "price-asc" ? a.priceCents - b.priceCents : sort === "price-desc" ? b.priceCents - a.priceCents : sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : 0;
    return categories
      .filter((c) => category === "all" || c.slug === category)
      .map((c) => ({ ...c, products: c.products.filter(match).sort(sorter) }))
      .filter((c) => c.products.length > 0);
  }, [categories, q, category, onlyPopular, onlyAvailable, sort]);

  const total = groups.reduce((n, g) => n + g.products.length, 0);

  return (
    <div className="mt-10">
      <div className="sticky top-16 z-20 -mx-4 border-b border-osso/8 bg-carvao/92 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-20 lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div role="group" aria-label="Categorias" className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
            {[{ slug: "all", name: "Tudo" }, ...categories].map((c) => (
              <button
                key={c.slug}
                type="button"
                aria-pressed={category === c.slug}
                onClick={() => setCategory(c.slug)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                  category === c.slug ? "border-brasa bg-brasa text-carvao" : "border-osso/20 text-osso/85 hover:border-osso/60",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <label className="relative min-w-0 flex-1 basis-full sm:basis-auto lg:max-w-xs">
              <span className="sr-only">Buscar no cardápio</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fumaca" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar: bacon, picles, shake…"
                className="h-10 w-full rounded-full border border-osso/20 bg-transparent pr-9 pl-10 text-sm placeholder:text-fumaca focus:border-brasa focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full hover:bg-osso/10">
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </label>
            <button
              type="button"
              aria-pressed={onlyPopular}
              onClick={() => setOnlyPopular((v) => !v)}
              className={cn("flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm", onlyPopular ? "border-brasa text-brasa" : "border-osso/20 text-osso/85")}
            >
              <Flame className="size-4" aria-hidden /> Mais pedidos
            </button>
            <button
              type="button"
              aria-pressed={onlyAvailable}
              onClick={() => setOnlyAvailable((v) => !v)}
              className={cn("h-10 rounded-full border px-4 text-sm", onlyAvailable ? "border-brasa text-brasa" : "border-osso/20 text-osso/85")}
            >
              Disponíveis
            </button>
            <label className="flex items-center">
              <span className="sr-only">Ordenar por</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-10 rounded-full border border-osso/20 bg-carvao px-4 text-sm focus:border-brasa focus:outline-none"
              >
                <option value="relevance">Ordem da casa</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="name">Nome (A–Z)</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {total} {total === 1 ? "produto encontrado" : "produtos encontrados"}
      </p>

      {groups.length === 0 ? (
        <div className="py-24 text-center">
          <p className="display text-4xl">Nada com “{query}”</p>
          <p className="mt-3 text-fumaca">Tente outro ingrediente ou limpe os filtros.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setOnlyPopular(false);
              setOnlyAvailable(false);
            }}
            className="mt-6 rounded-full border border-osso/30 px-5 py-2.5 text-sm hover:border-osso"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.slug} aria-labelledby={`cat-${g.slug}`} className="pt-14">
            <h2 id={`cat-${g.slug}`} className="display mb-2 text-5xl text-fumaca">
              {g.name}
            </h2>
            <ul className="grid gap-x-10 md:grid-cols-2">
              {g.products.map((p) => (
                <li key={p.id} className="border-b border-osso/10">
                  <MenuRow product={p} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function MenuRow({ product: p }: { product: MenuProduct }) {
  return (
    <Link href={`/cardapio/${p.slug}`} className="group flex gap-5 py-6" data-testid="menu-item">
      <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-fuligem sm:size-32">
        <Image src={p.imageUrl} alt="" fill sizes="128px" className={cn("object-cover transition-transform duration-500 ease-brasa group-hover:scale-105", !p.isAvailable && "grayscale")} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="display text-3xl group-hover:text-brasa">{p.name}</h3>
          <p className="display tabular shrink-0 pt-1 text-2xl">{formatBRL(p.priceCents)}</p>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-fumaca">{p.tagline ?? p.description}</p>
        <p className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2 text-xs">
          {p.isPopular && (
            <span className="inline-flex items-center gap-1 text-brasa">
              <Flame className="size-3.5" aria-hidden /> Mais pedido
            </span>
          )}
          {!p.isAvailable && <span className="text-[#ff8a70]">Esgotado hoje</span>}
          {p.allowsDoneness && <span className="text-fumaca">Escolha o ponto</span>}
        </p>
      </div>
    </Link>
  );
}
