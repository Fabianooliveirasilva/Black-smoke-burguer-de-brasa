import { readJson, route } from "@/lib/http";
import { couponSchema } from "@/schemas/catalog";
import { createCoupon, listCoupons } from "@/server/admin";

export const GET = route({ auth: "admin" }, async () => ({ items: await listCoupons() }));
export const POST = route({ auth: "admin" }, async ({ req }) => Response.json(await createCoupon(await readJson(req, couponSchema)), { status: 201 }));
