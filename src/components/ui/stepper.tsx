"use client";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
  label,
  tone = "dark",
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  tone?: "dark" | "paper";
  size?: "sm" | "md";
}) {
  const btn = cn(
    "grid place-items-center rounded-full border transition-colors disabled:opacity-30",
    size === "sm" ? "size-9" : "size-11",
    tone === "dark" ? "border-osso/25 hover:border-osso" : "border-tinta/30 hover:bg-tinta hover:text-kraft",
  );
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Diminuir ${label}`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <output className="tabular w-8 text-center font-semibold" aria-live="polite" aria-label={`${label}: ${value}`}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Aumentar ${label}`}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
