import { notFound, route } from "@/lib/http";
import { getOrderByToken } from "@/server/orders";
import { toTrackingView } from "@/server/order-view";

export const GET = route<{ token: string }>({ rateLimit: { name: "track", limit: 120, windowMs: 60_000 } }, async ({ params }) => {
  const order = await getOrderByToken(params.token);
  if (!order) throw notFound("Pedido");
  return toTrackingView(order);
});
