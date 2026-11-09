import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getMenu } from "@/server/catalog";
import { MenuBrowser } from "@/components/menu/menu-browser";

export const metadata: Metadata = {
  title: "Cardápio",
  description: "Burgers de brasa, combos, acompanhamentos e milkshakes. Peça para entrega na Zona Oeste de São Paulo ou retire em Pinheiros.",
  alternates: { canonical: "/cardapio" },
};

async function Menu() {
  await connection();
  const menu = await getMenu();
  return <MenuBrowser categories={menu} />;
}

export default function MenuPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <h1 className="display text-[clamp(4rem,14vw,9rem)]">Cardápio</h1>
      <p className="mt-4 max-w-lg text-fumaca">
        Todos os burgers saem com blend moído no dia. Os de 160 g ou mais aceitam ponto da carne; os smashes saem sempre bem passados, é o que forma a crosta.
      </p>
      <Suspense fallback={<div className="mt-12 h-[60vh] animate-pulse rounded-3xl bg-fuligem" />}>
        <Menu />
      </Suspense>
    </div>
  );
}
