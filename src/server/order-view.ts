import type { PublicOrder } from "./orders";
import { STATUS_LABEL, customerCanCancel, timeline } from "./order-status";

/** Serializable view model for the tracking ticket (shared by page and API). */
export function toTrackingView(o: PublicOrder) {
  const pay = o.payments[0];
  return {
    number: o.number,
    token: o.trackingToken,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status],
    fulfillment: o.fulfillment,
    firstName: o.customerName.split(" ")[0],
    address: o.fulfillment === "DELIVERY" ? `${o.street}, ${o.addressNumber} — ${o.neighborhood}` : null,
    etaMinutes: o.deliveryZone?.etaMinutes ?? null,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    subtotalCents: o.subtotalCents,
    discountCents: o.discountCents,
    deliveryFeeCents: o.deliveryFeeCents,
    totalCents: o.totalCents,
    changeForCents: o.changeForCents,
    couponCode: o.coupon?.code ?? null,
    cancelReason: o.cancelReason,
    createdAt: o.createdAt.toISOString(),
    canCancel: customerCanCancel(o.status, o.paymentStatus),
    steps: timeline(o.fulfillment).map((s) => ({
      status: s,
      label: STATUS_LABEL[s],
      at: o.events.find((e) => e.status === s)?.createdAt.toISOString() ?? null,
    })),
    items: o.items.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
      doneness: i.doneness,
      removed: i.removedIngredients,
      options: i.options.map((op) => `${op.quantity > 1 ? `${op.quantity}× ` : ""}${op.name}`),
      notes: i.notes,
    })),
    payment: pay
      ? {
          method: pay.method,
          status: pay.status,
          pixQrCode: pay.status === "PENDING" ? pay.pixQrCode : null,
          pixQrCodeBase64: pay.status === "PENDING" ? pay.pixQrCodeBase64 : null,
          checkoutUrl: pay.status === "PENDING" ? pay.checkoutUrl : null,
          expiresAt: pay.expiresAt?.toISOString() ?? null,
        }
      : null,
  };
}
export type TrackingView = ReturnType<typeof toTrackingView>;
