import Image from "next/image";
import Link from "next/link";
import { formatBRL } from "@/lib/money";
import type { MenuProduct } from "@/server/catalog";

export function ProductCard({ product, sizes = "(min-width: 1024px) 30vw, 80vw" }: { product: MenuProduct; sizes?: string }) {
  return (
    <Link
      href={`/cardapio/${product.slug}`}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-fuligem p-6"
      data-testid="product-card"
    >
      <Image
        src={product.imageUrl}
        alt=""
        fill
        sizes={sizes}
        className="-z-0 object-cover transition-transform duration-700 ease-brasa group-hover:scale-[1.04]"
      />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,rgb(16_12_9/0.95)_0%,rgb(16_12_9/0.55)_38%,transparent_62%)]" />
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <h3 className="display text-4xl">{product.name}</h3>
          {product.tagline && <p className="mt-2 max-w-[28ch] text-sm text-osso/75">{product.tagline}</p>}
        </div>
        <p className="display tabular shrink-0 text-2xl text-brasa">{formatBRL(product.priceCents)}</p>
      </div>
      {!product.isAvailable && (
        <span className="absolute top-5 left-5 rounded-full bg-sangue px-3 py-1 text-xs font-semibold">Esgotado hoje</span>
      )}
    </Link>
  );
}
