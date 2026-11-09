"use client";
import { cn } from "@/lib/utils";

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-brasa" : "bg-osso/20")}
    >
      <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-osso transition-transform", checked && "translate-x-5")} />
    </button>
  );
}
