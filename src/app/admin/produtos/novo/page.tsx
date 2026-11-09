import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { listCategories } from "@/server/admin";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Novo produto" };

export default async function NewProduct() {
  await requireAdmin();
  const categories = await listCategories();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/produtos" className="text-sm text-fumaca hover:text-osso">← Produtos</Link>
      <h1 className="display text-6xl">Novo produto</h1>
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
