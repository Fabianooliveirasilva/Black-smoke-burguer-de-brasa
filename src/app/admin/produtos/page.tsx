import { requireAdmin } from "@/lib/session";
import Image from "next/image";
import Link from "next/link";
import { listCategories, listProducts } from "@/server/admin";
import { formatBRL } from "@/lib/money";
import { buttonClass } from "@/components/ui/button";
import { ProductToggles } from "@/components/admin/product-toggles";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata = { title: "Produtos" };

export default async function ProductsPage() {
  await requireAdmin();
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-6xl">Produtos</h1>
        <Link href="/admin/produtos/novo" className={buttonClass("primary")}>Novo produto</Link>
      </div>
      <div className="overflow-x-auto rounded-3xl bg-fuligem">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="text-fumaca">
            <tr className="border-b border-osso/10"><th className="px-5 py-3 font-medium">Produto</th><th className="px-3 py-3 font-medium">Categoria</th><th className="px-3 py-3 font-medium">Preço</th><th className="px-3 py-3 font-medium">Disponível / Destaque</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-osso/6 last:border-0" data-testid="admin-product-row">
                <td className="px-5 py-3">
                  <Link href={`/admin/produtos/${p.id}`} className="flex items-center gap-3 hover:text-brasa">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-carvao"><Image src={p.imageUrl} alt="" fill sizes="44px" className="object-cover" /></span>
                    <span className="font-medium">{p.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-fumaca">{p.category.name}</td>
                <td className="px-3 py-3">{formatBRL(p.priceCents)}</td>
                <td className="px-3 py-3"><ProductToggles id={p.id} name={p.name} isAvailable={p.isAvailable} isPopular={p.isPopular} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CategoryManager categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, sortOrder: c.sortOrder, active: c.active, count: c._count.products }))} />
    </div>
  );
}
