import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Hero } from "@/components/home/hero";
import { Ingredients, Location, PopularRail, Process, Promotions, RailSkeleton, SectionHeading, Testimonials } from "@/components/home/sections";
import { VideoSection } from "@/components/home/video-section";
import { RestaurantJsonLd } from "@/components/home/restaurant-jsonld";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <Hero />

      <section aria-labelledby="populares-title" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-10 lg:pt-32">
        <SectionHeading id="populares-title" title="Os mais pedidos">
          <ButtonLink href="/cardapio" variant="outline" className="self-start md:self-auto">
            Cardápio completo
          </ButtonLink>
        </SectionHeading>
        <Suspense fallback={<RailSkeleton />}>
          <PopularRail />
        </Suspense>
      </section>

      <Process />
      <Ingredients />
      <VideoSection />

      <section aria-labelledby="promocoes-title" id="promocoes" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <SectionHeading id="promocoes-title" title="Cupons da semana">
          <p className="max-w-sm text-fumaca">Toque no código: ele já vai aplicado para o seu carrinho.</p>
        </SectionHeading>
        <Suspense fallback={<div className="mt-10 h-40 animate-pulse rounded bg-fuligem" />}>
          <Promotions />
        </Suspense>
      </section>

      <Testimonials />

      <section aria-labelledby="onde-title" id="onde" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <SectionHeading id="onde-title" title="Onde estamos" />
        <Suspense fallback={<div className="mt-10 h-96 animate-pulse rounded-[1.75rem] bg-fuligem" />}>
          <Location />
        </Suspense>
      </section>

      <Suspense>
        <RestaurantJsonLd />
      </Suspense>
    </>
  );
}
