import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";
import { CartButton, MobileNav } from "./header-client";
import { UserRound } from "lucide-react";

export const NAV = [
  { href: "/cardapio", label: "Cardápio" },
  { href: "/#processo", label: "Como fazemos" },
  { href: "/#promocoes", label: "Promoções" },
  { href: "/#onde", label: "Onde estamos" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-osso/8 bg-carvao/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-10">
        <Link href="/" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="rounded-full px-4 py-2 text-[0.95rem] text-osso/80 transition-colors hover:text-osso">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href="/conta" aria-label="Minha conta" className="grid size-11 place-items-center rounded-full text-osso/80 hover:bg-osso/8 hover:text-osso">
            <UserRound className="size-5" aria-hidden />
          </Link>
          <CartButton />
          <Suspense fallback={<span className="size-11 md:hidden" />}>
            <MobileNav items={NAV} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
