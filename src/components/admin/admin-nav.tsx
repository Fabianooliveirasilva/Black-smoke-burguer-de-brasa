"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/loja", label: "Loja" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Administração" className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors lg:rounded-xl", active ? "bg-osso text-carvao" : "text-osso/75 hover:bg-osso/8 hover:text-osso")}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
