"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * Muted ambient video. Autoplays only when visible and when the user has not
 * asked for reduced motion; always has a visible play/pause control (WCAG 2.2.2).
 */
export function VideoSection() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => {});
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  return (
    <section aria-labelledby="video-title" className="relative isolate my-24 overflow-hidden lg:my-36">
      <video
        ref={ref}
        className="absolute inset-0 -z-10 size-full object-cover"
        muted
        loop
        playsInline
        preload="none"
        poster="/images/brand/grill-poster.jpg"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        aria-label="Chamas na grelha e um burger sendo virado na chapa"
      >
        <source src="/videos/grill.webm" type="video/webm" />
        <source src="/videos/grill.mp4" type="video/mp4" />
      </video>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgb(21_17_14/0.92),rgb(21_17_14/0.25)_55%,rgb(21_17_14/0.6))]" />
      <div className="mx-auto flex min-h-[78svh] max-w-7xl flex-col justify-end px-4 py-14 sm:px-6 lg:px-10">
        <h2 id="video-title" className="display max-w-[12ch] text-[clamp(3rem,9vw,7.5rem)]">
          Dezoito segundos de chapa
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-6">
          <p className="max-w-md text-osso/85">
            É o tempo entre a carne tocar o ferro e a crosta estar pronta. O resto da noite a gente passa cuidando para que ela não esfrie no caminho.
          </p>
          <button
            type="button"
            onClick={toggle}
            className="flex h-12 items-center gap-2 rounded-full border border-osso/40 px-5 text-sm font-semibold hover:border-osso hover:bg-osso/10"
            aria-pressed={playing}
          >
            {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            {playing ? "Pausar vídeo" : "Reproduzir vídeo"}
          </button>
        </div>
      </div>
    </section>
  );
}
