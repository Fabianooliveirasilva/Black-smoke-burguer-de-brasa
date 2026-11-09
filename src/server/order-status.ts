import type { Fulfillment, OrderStatus } from "@/generated/prisma/enums";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  RECEIVED: "Pedido recebido",
  PREPARING: "Em preparação",
  ASSEMBLING: "Em montagem",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  READY_FOR_PICKUP: "Pronto para retirada",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

/** Ordered steps shown on the tracking ticket for each fulfillment type. */
export function timeline(fulfillment: Fulfillment): OrderStatus[] {
  return fulfillment === "DELIVERY"
    ? ["RECEIVED", "PREPARING", "ASSEMBLING", "OUT_FOR_DELIVERY", "DELIVERED"]
    : ["RECEIVED", "PREPARING", "ASSEMBLING", "READY_FOR_PICKUP", "DELIVERED"];
}

export function allowedNextStatuses(current: OrderStatus, fulfillment: Fulfillment): OrderStatus[] {
  if (current === "DELIVERED" || current === "CANCELED") return [];
  const steps = timeline(fulfillment);
  const idx = steps.indexOf(current);
  const next = idx >= 0 && idx < steps.length - 1 ? [steps[idx + 1]] : [];
  return current === "RECEIVED" || current === "PREPARING" ? [...next, "CANCELED"] : next;
}

export function canTransition(from: OrderStatus, to: OrderStatus, fulfillment: Fulfillment) {
  return allowedNextStatuses(from, fulfillment).includes(to);
}

/** Customers may cancel only before the kitchen starts and before an online payment is confirmed. */
export function customerCanCancel(status: OrderStatus, paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED") {
  return status === "RECEIVED" && paymentStatus !== "PAID";
}
