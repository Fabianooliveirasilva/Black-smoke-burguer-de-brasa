import { readJson, route } from "@/lib/http";
import { updateStatusSchema } from "@/schemas/order";
import { getAdminOrder } from "@/server/admin";
import { updateOrderStatus } from "@/server/orders";

type P = { id: string };
export const GET = route<P>({ auth: "admin" }, async ({ params }) => getAdminOrder(params.id));
export const PATCH = route<P>({ auth: "admin" }, async ({ req, params, user }) => {
  const { status, note } = await readJson(req, updateStatusSchema);
  await updateOrderStatus(params.id, status, user.id, note);
  return getAdminOrder(params.id);
});
