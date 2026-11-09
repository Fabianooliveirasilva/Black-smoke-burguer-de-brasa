import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/ui/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Admin Black Smoke" }, robots: { index: false, follow: false } };

/** Server-side gate: nothing under /admin renders unless the session is an admin. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <>
      <p className="mb-6 text-sm text-fumaca lg:hidden">Conectado como {user.email}</p>
      {children}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 z-30 border-b border-osso/10 bg-[#100d0b] px-4 py-3 lg:h-svh lg:border-r lg:border-b-0 lg:px-5 lg:py-8">
        <div className="mb-3 flex items-center justify-between lg:mb-10">
          <Link href="/admin" className="flex items-center gap-2">
            <LogoMark className="size-8 text-osso" />
            <span className="display text-xl">Black Smoke</span>
          </Link>
          <Link href="/" className="text-xs text-fumaca hover:text-osso lg:hidden">
            Ver loja
          </Link>
        </div>
        <Suspense>
          <AdminNav />
        </Suspense>
        <Link href="/" className="mt-10 hidden text-sm text-fumaca hover:text-osso lg:block">
          Ver loja
        </Link>
      </aside>
      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-fuligem" />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}
