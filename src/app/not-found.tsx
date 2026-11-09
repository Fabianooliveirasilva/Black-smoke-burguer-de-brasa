import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { buttonClass } from "@/components/ui/button";

// Overrides the root layout's "index, follow" (the 404 must not carry contradictory robots tags)
// and its home-page title.
export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col items-start justify-center gap-6 px-4">
      <LogoMark className="size-14 text-osso" />
      <h1 className="display text-[clamp(4rem,14vw,9rem)]">Saiu da chapa</h1>
      <p className="max-w-md text-lg text-fumaca">Esta página não existe ou o item foi retirado do cardápio.</p>
      <div className="flex gap-3">
        <Link href="/cardapio" className={buttonClass("primary", "lg")}>Ver cardápio</Link>
        <Link href="/" className={buttonClass("outline", "lg")}>Início</Link>
      </div>
    </main>
  );
}
