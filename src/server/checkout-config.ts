import "server-only";
import { connection } from "next/server";
import { onlinePaymentsEnabled } from "@/lib/env";
import { getStore, storeIsAcceptingOrders } from "./store";

/** Public, client-safe store config used by cart and checkout. */
export async function getCheckoutConfig() {
  await connection();
  const { settings, zones } = await getStore();
  const status = storeIsAcceptingOrders(settings);
  return {
    zones: zones.map((z) => ({ id: z.id, name: z.name, neighborhoods: z.neighborhoods, feeCents: z.feeCents, etaMinutes: z.etaMinutes })),
    deliveryEnabled: settings.deliveryEnabled,
    pickupEnabled: settings.pickupEnabled,
    minOrderCents: settings.minOrderCents,
    prepTimeMinutes: settings.prepTimeMinutes,
    pickupAddress: `${settings.street}, ${settings.neighborhood}`,
    open: status.open,
    closedReason: status.open ? null : status.reason,
    onlinePayments: onlinePaymentsEnabled(),
  };
}
export type CheckoutConfig = Awaited<ReturnType<typeof getCheckoutConfig>>;
