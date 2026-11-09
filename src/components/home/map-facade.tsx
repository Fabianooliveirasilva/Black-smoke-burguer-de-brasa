"use client";
import Image from "next/image";
import { useState } from "react";
import { MapPin } from "lucide-react";

/**
 * Click-to-load map: no third-party requests (≈300 KB of OpenStreetMap JS) until
 * the visitor asks for the map. Better performance and privacy by default.
 */
export function MapFacade({ src, title }: { src: string; title: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="relative min-h-80 overflow-hidden rounded-[1.75rem] bg-fuligem">
      {on ? (
        <iframe title={title} src={src} className="absolute inset-0 size-full [filter:invert(0.92)_hue-rotate(180deg)_saturate(0.6)_brightness(0.9)]" />
      ) : (
        <>
          <Image src="/images/brand/fire-patty.jpg" alt="" fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover opacity-30" />
          <button
            type="button"
            onClick={() => setOn(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-osso hover:bg-carvao/30"
          >
            <span className="grid size-14 place-items-center rounded-full bg-brasa text-carvao">
              <MapPin className="size-6" aria-hidden />
            </span>
            <span className="font-semibold">Mostrar mapa</span>
            <span className="text-xs text-fumaca">Carrega o OpenStreetMap</span>
          </button>
        </>
      )}
    </div>
  );
}
