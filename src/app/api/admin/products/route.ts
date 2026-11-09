import { readJson, route } from "@/lib/http";
import { productSchema } from "@/schemas/catalog";
import { createProduct, listProducts } from "@/server/admin";

export const GET = route({ auth: "admin" }, async () => ({ products: await listProducts() }));
export const POST = route({ auth: "admin" }, async ({ req }) => Response.json(await createProduct(await readJson(req, productSchema)), { status: 201 }));
