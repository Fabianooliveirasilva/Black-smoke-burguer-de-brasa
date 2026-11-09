"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/utils";
import { api } from "./api";
import { Switch } from "./switch";

interface Cat { id: string; name: string; slug: string; sortOrder: number; active: boolean; count: number }

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <section aria-labelledby="cats" className="rounded-3xl bg-fuligem p-6">
      <h2 id="cats" className="display text-4xl">Categorias</h2>
      <ul className="mt-4 divide-y divide-osso/8">
        {categories.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span>{c.name} <span className="text-sm text-fumaca">· {c.count} produtos · ordem {c.sortOrder}</span></span>
            <span className="flex items-center gap-3">
              <Switch label={`Categoria ${c.name} ativa`} checked={c.active} onChange={(v) => run(() => api(`/api/admin/categories/${c.id}`, "PATCH", { active: v }))} />
              <button type="button" className="text-sm text-fumaca underline hover:text-osso" onClick={() => confirm(`Excluir ${c.name}?`) && run(() => api(`/api/admin/categories/${c.id}`, "DELETE"))}>Excluir</button>
            </span>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await api("/api/admin/categories", "POST", { name, slug: slugify(name), sortOrder: categories.length });
            setName("");
          });
        }}
      >
        <label className="sr-only" htmlFor="newcat">Nova categoria</label>
        <input id="newcat" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" className="h-11 min-w-0 flex-1 rounded-full border border-osso/15 bg-carvao px-4 focus:border-brasa focus:outline-none" />
        <Button type="submit" disabled={name.trim().length < 2}>Adicionar</Button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-[#ff8a70]">{error}</p>}
    </section>
  );
}
