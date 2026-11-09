import { readJson, route } from "@/lib/http";
import { categorySchema } from "@/schemas/catalog";
import { createCategory, listCategories } from "@/server/admin";

export const GET = route({ auth: "admin" }, async () => ({ items: await listCategories() }));
export const POST = route({ auth: "admin" }, async ({ req }) => Response.json(await createCategory(await readJson(req, categorySchema)), { status: 201 }));
