import { readPatch, route } from "@/lib/http";
import { deliveryZoneSchema } from "@/schemas/catalog";
import { deleteZone, updateZone } from "@/server/admin";

type P = { id: string };
const patchSchema = deliveryZoneSchema.partial().strict();
export const PATCH = route<P>({ auth: "admin" }, async ({ req, params }) => updateZone(params.id, await readPatch(req, patchSchema)));
export const DELETE = route<P>({ auth: "admin" }, async ({ params }) => {
  await deleteZone(params.id);
  return null;
});
