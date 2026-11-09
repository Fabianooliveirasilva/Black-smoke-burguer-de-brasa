import { cn } from "@/lib/utils";

/** Original mark: a burger silhouette whose top bun dissolves into three smoke strokes. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("shrink-0", className)} fill="none">
      <path d="M13 11c-2-2.4 2-3.6 0-6.5M20 11c-2-2.4 2-3.6 0-6.5M27 11c-2-2.4 2-3.6 0-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 22c0-5.5 6.3-8.5 14-8.5S34 16.5 34 22H6Z" fill="var(--color-brasa)" />
      <rect x="5" y="24.5" width="30" height="3.6" rx="1.8" fill="currentColor" />
      <path d="M6 30.5h28c0 3-3 4.8-6.5 4.8h-15C9 35.3 6 33.5 6 30.5Z" fill="var(--color-brasa)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="size-9" />
      <span className="flex flex-col leading-none">
        <span className="display text-[1.55rem] tracking-tight">Black Smoke</span>
        <span className="text-[0.62rem] font-semibold tracking-[0.32em] text-fumaca">BURGER DE BRASA</span>
      </span>
    </span>
  );
}
