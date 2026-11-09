"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useCart } from "@/components/cart/cart-store";

export function CopyCode({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "done">("idle");
  const setCoupon = useCart((s) => s.setCoupon);
  return (
    <button
      type="button"
      onClick={async () => {
        setCoupon(code);
        try {
          await navigator.clipboard.writeText(code);
        } catch {
          /* clipboard may be blocked; coupon is still applied to the cart */
        }
        setState("done");
        setTimeout(() => setState("idle"), 2400);
      }}
      className="flex shrink-0 items-center gap-3 self-start rounded-full border-2 border-dashed border-tinta/50 px-5 py-3 font-bold tracking-wider text-tinta transition-colors hover:bg-tinta hover:text-kraft sm:self-auto"
      aria-label={`Usar cupom ${code}`}
    >
      {code}
      {state === "done" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span aria-live="polite" className="sr-only">
        {state === "done" ? "Cupom copiado e aplicado ao carrinho" : ""}
      </span>
    </button>
  );
}
