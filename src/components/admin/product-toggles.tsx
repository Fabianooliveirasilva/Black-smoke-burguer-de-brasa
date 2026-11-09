"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./api";
import { Switch } from "./switch";

export function ProductToggles({ id, name, isAvailable, isPopular }: { id: string; name: string; isAvailable: boolean; isPopular: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const patch = async (data: object) => {
    setBusy(true);
    try {
      await api(`/api/admin/products/${id}`, "PATCH", data);
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-4">
      <Switch label={`${name} disponível`} checked={isAvailable} disabled={busy} onChange={(v) => patch({ isAvailable: v })} />
      <Switch label={`${name} em destaque`} checked={isPopular} disabled={busy} onChange={(v) => patch({ isPopular: v })} />
    </div>
  );
}
