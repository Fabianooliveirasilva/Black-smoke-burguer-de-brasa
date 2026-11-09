import { route } from "@/lib/http";
import { getOrderByToken, retryPayment } from "@/server/orders";
import { toTrackingView } from "@/server/order-view";

export const POST = route<{ token: string }>({ rateLimit: { name: "pay", limit: 5, windowMs: 60_000 } }, async ({ params }) => {
  await retryPayment(params.token);
  return toTrackingView((await getOrderByToken(params.token))!);
});
