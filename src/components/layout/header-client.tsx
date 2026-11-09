"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart/cart-store";
import { useMounted } from "@/hooks/use-mounted";
import { formatBRL } from "@/lib/money";
import { unitEstimate } from "@/components/cart/cart-store";

export function useCartCount() {
  const mounted = useMounted();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  return mounted ? count : 0;
}

export function CartButton() {
  const count = useCartCount();
  return (
    <Link
      href="/carrinho"
      aria-label={count ? `Carrinho, ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho vazio"}
      className="relative grid size-11 place-items-center rounded-full text-osso/80 hover:bg-osso/8 hover:text-osso"
      data-testid="cart-button"
    >
      <ShoppingBag className="size-5" aria-hidden />
      {count > 0 && (
        <span
          key={count}
          className="badge-pop tabular absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brasa px-1 text-[0.7rem] font-bold text-carvao"
          data-testid="cart-count"
        >
          {count}
        </span>
      )}
    </Link>
  );
}

export function MobileNav({ items }: { items: Array<{ href: string; label: string }> }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const btn = useRef<HTMLButtonElement>(null);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-full text-osso hover:bg-osso/8"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open && (
          <nav id="mobile-nav" aria-label="Menu" className="sheet-in fixed inset-x-0 top-16 bottom-0 z-50 bg-carvao px-4 pt-6">
            <ul className="flex flex-col">
              {items.map((n) => (
                <li key={n.href} className="border-b border-osso/10">
                  <Link href={n.href} onClick={() => setOpen(false)} className="display block py-5 text-5xl">
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/conta" onClick={() => setOpen(false)} className="block py-5 text-lg text-fumaca">
                  Minha conta e pedidos
                </Link>
              </li>
            </ul>
          </nav>
      )}
    </div>
  );
}

/** Sticky bottom bar on small screens whenever the cart has items. */
export function MobileCartBar() {
  const mounted = useMounted();
  const items = useCart((s) => s.items);
  const pathname = usePathname();
  if (!mounted || items.length === 0 || pathname.startsWith("/carrinho") || pathname.startsWith("/checkout")) return null;
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const total = items.reduce((s, i) => s + unitEstimate(i) * i.quantity, 0);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <Link
        href="/carrinho"
        className="flex h-14 items-center justify-between rounded-full bg-brasa px-6 font-semibold text-carvao shadow-[0_10px_40px_-10px_rgb(255_107_44/0.6)]"
      >
        <span>Ver pedido · {count} {count === 1 ? "item" : "itens"}</span>
        <span className="tabular">{formatBRL(total)}</span>
      </Link>
    </div>
  );
}
