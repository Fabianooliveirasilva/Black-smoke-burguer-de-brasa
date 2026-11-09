"use client";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-3xl flex-col items-start justify-center gap-6 px-4">
      <h1 className="display text-7xl">A chapa esfriou</h1>
      <p className="max-w-md text-fumaca">Algo falhou ao carregar esta página. Seu carrinho continua salvo.</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className={buttonClass("primary")}>Tentar de novo</button>
        <Link href="/" className={buttonClass("outline")}>Início</Link>
      </div>
    </main>
  );
}
