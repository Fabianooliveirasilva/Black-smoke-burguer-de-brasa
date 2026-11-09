import { route } from "@/lib/http";
import { cancelByCustomer, getOrderByToken } from "@/server/orders";
import { toTrackingView } from "@/server/order-view";

export const POST = route<{ token: string }>({ rateLimit: { name: "cancel", limit: 10, windowMs: 60_000 } }, async ({ params }) => {
  await cancelByCustomer(params.token);
  return toTrackingView((await getOrderByToken(params.token))!);
});
