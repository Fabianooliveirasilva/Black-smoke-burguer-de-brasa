import { z } from "zod";
import { readJson, route } from "@/lib/http";
import { id } from "@/schemas/common";
import { lineSchema } from "@/schemas/order";
import { quoteCart } from "@/server/quote";

const schema = z.object({
  items: z.array(lineSchema).max(30),
  couponCode: z.string().trim().toUpperCase().max(30).nullable().optional(),
  deliveryZoneId: id.nullable().optional(),
});

export const POST = route({ rateLimit: { name: "quote", limit: 60, windowMs: 60_000 } }, async ({ req }) => {
  const body = await readJson(req, schema);
  return quoteCart({ ...body, items: body.items.map((i) => ({ ...i, doneness: i.doneness ?? null })) });
});
