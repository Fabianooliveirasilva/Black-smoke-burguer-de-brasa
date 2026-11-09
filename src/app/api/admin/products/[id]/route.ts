import { readPatch, route } from "@/lib/http";
import { productPatchSchema } from "@/schemas/catalog";
import { deleteProduct, getProduct, updateProduct } from "@/server/admin";

type P = { id: string };
export const GET = route<P>({ auth: "admin" }, async ({ params }) => getProduct(params.id));
export const PATCH = route<P>({ auth: "admin" }, async ({ req, params }) => updateProduct(params.id, await readPatch(req, productPatchSchema)));
export const DELETE = route<P>({ auth: "admin" }, async ({ params }) => {
  await deleteProduct(params.id);
  return null;
});
