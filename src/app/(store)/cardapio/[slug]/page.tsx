import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { getProductBySlug } from "@/server/catalog";
import { ProductCustomizer } from "@/components/menu/product-customizer";
import { formatBRL } from "@/lib/money";
import { siteUrl } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/cardapio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  // Overrides the root layout's "index, follow" so it never contradicts notFound()'s noindex.
  if (!p) return { title: "Produto não encontrado", robots: { index: false, follow: false } };
  return {
    title: p.name,
    description: `${p.tagline ?? ""} ${p.description}`.trim().slice(0, 160),
    alternates: { canonical: `/cardapio/${p.slug}` },
    openGraph: { title: p.name, description: p.tagline ?? p.description, images: [{ url: p.imageUrl, alt: p.name }] },
  };
}

async function Product({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: p.name,
    description: p.description,
    image: `${siteUrl()}${p.imageUrl}`,
    offers: { "@type": "Offer", price: (p.priceCents / 100).toFixed(2), priceCurrency: "BRL", availability: p.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };
  return (
    <article className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="relative -mx-4 aspect-square overflow-hidden bg-fuligem sm:mx-0 sm:rounded-[2rem] lg:sticky lg:top-28 lg:self-start">
        <Image src={p.imageUrl} alt={`${p.name}: ${p.tagline ?? ""}`} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
      </div>
      <div>
        <p className="text-sm text-fumaca">{p.category.name}</p>
        <h1 className="display mt-2 text-[clamp(3.5rem,9vw,6.5rem)]">{p.name}</h1>
        {p.tagline && <p className="mt-4 text-xl text-osso/90">{p.tagline}</p>}
        <p className="mt-4 max-w-prose text-fumaca">{p.description}</p>
        <p className="display tabular mt-6 text-4xl text-brasa">{formatBRL(p.priceCents)}</p>
        {p.ingredients.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold">Ingredientes</h2>
            <p className="mt-2 text-fumaca">{p.ingredients.map((i) => i.name).join(" · ")}</p>
          </div>
        )}
        <ProductCustomizer product={p} />
      </div>
    </article>
  );
}

/** Mirrors the final two-column layout so streaming in the product causes no layout shift. */
function ProductSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16" aria-hidden>
      <div className="-mx-4 aspect-square animate-pulse bg-fuligem sm:mx-0 sm:rounded-[2rem]" />
      <div className="flex flex-col gap-4">
        <div className="h-4 w-20 rounded bg-fuligem" />
        <div className="h-28 w-3/4 rounded-xl bg-fuligem" />
        <div className="h-24 rounded-xl bg-fuligem" />
        <div className="h-[36rem] rounded-xl bg-fuligem/50" />
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/cardapio/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
      <Link href="/cardapio" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-fumaca hover:text-osso">
        <ArrowLeft className="size-4" aria-hidden /> Voltar ao cardápio
      </Link>
      <Suspense fallback={<ProductSkeleton />}>
        <Product params={params} />
      </Suspense>
    </div>
  );
}
