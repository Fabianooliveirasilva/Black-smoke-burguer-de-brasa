import { readPatch, route } from "@/lib/http";
import { categorySchema } from "@/schemas/catalog";
import { deleteCategory, updateCategory } from "@/server/admin";

type P = { id: string };
const patchSchema = categorySchema.partial().strict();
export const PATCH = route<P>({ auth: "admin" }, async ({ req, params }) => updateCategory(params.id, await readPatch(req, patchSchema)));
export const DELETE = route<P>({ auth: "admin" }, async ({ params }) => {
  await deleteCategory(params.id);
  return null;
});
