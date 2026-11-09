import { readPatch, route } from "@/lib/http";
import { couponBase } from "@/schemas/catalog";
import { deleteCoupon, updateCoupon } from "@/server/admin";

type P = { id: string };
const patchSchema = couponBase.partial().strict();
export const PATCH = route<P>({ auth: "admin" }, async ({ req, params }) => updateCoupon(params.id, await readPatch(req, patchSchema)));
export const DELETE = route<P>({ auth: "admin" }, async ({ params }) => {
  await deleteCoupon(params.id);
  return null;
});
