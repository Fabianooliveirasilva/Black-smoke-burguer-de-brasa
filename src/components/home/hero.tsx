import Image from "next/image";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { StoreStatus } from "@/components/layout/store-status";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="hero-photo absolute inset-0 -z-20">
        <Image
          src="/images/brand/hero-smash.jpg"
          alt="Smash burger duplo com cheddar escorrendo, picles e cebola, sobre prato de ferro escuro"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_50%] lg:object-[70%_50%]"
        />
      </div>
      {/* Legibility scrim for the headline over the photograph. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#15110e_0%,rgb(21_17_14/0.86)_34%,rgb(21_17_14/0.15)_70%),linear-gradient(0deg,#15110e_0%,transparent_35%)]" />
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-end px-4 pt-12 pb-10 sm:px-6 lg:min-h-[calc(100svh-5rem)] lg:px-10 lg:pb-14">
        <Suspense fallback={<p className="h-5" />}>
          <StoreStatus className="mb-6 text-osso/90" />
        </Suspense>
        <h1 id="hero-title" className="display max-w-[11ch] text-[clamp(3.4rem,min(15vw,12svh),10.5rem)]">
          {["Fumaça", "de lenha.", "Crosta", "de chapa."].map((line, i) => (
            <span key={line} className="hero-line block overflow-hidden pb-[0.04em]" style={{ "--i": i } as React.CSSProperties}>
              <span className={i % 2 === 1 ? "text-brasa" : undefined}>{line}</span>
            </span>
          ))}
        </h1>
        <p className="mt-6 max-w-md text-lg text-osso/85">
          Blend moído toda manhã aqui em Pinheiros, defumado em lenha de macieira e prensado no ferro a 260 °C. Entregamos na Zona Oeste ou você retira no balcão.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href="/cardapio" size="lg">
            Ver cardápio
          </ButtonLink>
          <ButtonLink href="/cardapio/smoke-classic" size="lg" variant="outline">
            Pedir o Smoke Classic
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
