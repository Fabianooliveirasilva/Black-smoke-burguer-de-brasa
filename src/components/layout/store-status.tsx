import { connection } from "next/server";
import { describeStatus } from "@/server/hours";
import { getStore } from "@/server/store";
import { cn } from "@/lib/utils";

export async function StoreStatus({ className }: { className?: string }) {
  await connection();
  const { settings } = await getStore();
  const status = settings.ordersPaused ? { open: false, label: "Pedidos pausados no momento" } : describeStatus(new Date(), settings.openingHours);
  return (
    <p className={cn("inline-flex items-center gap-2 text-sm", className)} data-testid="store-status">
      <span className={cn("size-2 rounded-full", status.open ? "bg-musgo shadow-[0_0_0_4px_rgb(111_138_78/0.25)]" : "bg-sangue")} aria-hidden />
      {status.label}
    </p>
  );
}
