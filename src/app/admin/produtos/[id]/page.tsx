import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, listCategories } from "@/server/admin";
import { HttpError } from "@/lib/http";
import { ProductForm } from "@/components/admin/product-form";
import { toFormValues } from "@/components/admin/product-values";

export const metadata = { title: "Editar produto" };

export default async function EditProduct({ params }: PageProps<"/admin/produtos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProduct(id).catch((e) => {
      if (e instanceof HttpError && e.status === 404) notFound();
      throw e;
    }),
    listCategories(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/produtos" className="text-sm text-fumaca hover:text-osso">← Produtos</Link>
      <h1 className="display text-6xl">{product.name}</h1>
      <ProductForm product={{ id: product.id, values: toFormValues(product) }} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
