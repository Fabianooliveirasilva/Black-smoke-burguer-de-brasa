import { STATUS_LABEL } from "@/server/order-status";
import type { OrderStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const tone: Record<OrderStatus, string> = {
  RECEIVED: "bg-brasa text-carvao",
  PREPARING: "bg-kraft text-tinta",
  ASSEMBLING: "bg-kraft text-tinta",
  OUT_FOR_DELIVERY: "bg-osso text-carvao",
  READY_FOR_PICKUP: "bg-osso text-carvao",
  DELIVERED: "bg-musgo/30 text-osso",
  CANCELED: "bg-sangue/40 text-osso",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", tone[status])}>{STATUS_LABEL[status]}</span>;
}
