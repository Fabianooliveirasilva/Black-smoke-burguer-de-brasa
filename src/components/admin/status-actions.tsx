"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "./api";

export function StatusActions({ orderId, next }: { orderId: string; next: Array<{ status: string; label: string }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (next.length === 0) return null;
  const change = async (status: string) => {
    let note: string | null = null;
    if (status === "CANCELED") {
      note = prompt("Motivo do cancelamento (o cliente verá esta mensagem):");
      if (note === null) return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/orders/${orderId}`, "PATCH", { status, note: note || null });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      {next.map((n) => (
        <Button key={n.status} variant={n.status === "CANCELED" ? "ghost" : "primary"} disabled={busy} onClick={() => change(n.status)} data-testid={`status-${n.status}`}>
          {n.status === "CANCELED" ? "Cancelar pedido" : `Marcar: ${n.label}`}
        </Button>
      ))}
      {error && <p role="alert" className="text-sm text-[#ff8a70]">{error}</p>}
    </div>
  );
}
