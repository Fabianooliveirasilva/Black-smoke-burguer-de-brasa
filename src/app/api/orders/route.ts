import { readJson, route } from "@/lib/http";
import { getUserFromHeaders } from "@/lib/session";
import { createOrderSchema } from "@/schemas/order";
import { createOrder } from "@/server/orders";

export const POST = route({ rateLimit: { name: "orders", limit: 8, windowMs: 10 * 60_000 } }, async ({ req }) => {
  const input = await readJson(req, createOrderSchema);
  const user = await getUserFromHeaders(req.headers);
  const { order, paymentError } = await createOrder(input, user?.id ?? null);
  return Response.json(
    { number: order.number, trackingToken: order.trackingToken, totalCents: order.totalCents, paymentError },
    { status: 201 },
  );
});
