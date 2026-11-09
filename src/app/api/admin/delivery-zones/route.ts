import { readJson, route } from "@/lib/http";
import { deliveryZoneSchema } from "@/schemas/catalog";
import { createZone, listZones } from "@/server/admin";

export const GET = route({ auth: "admin" }, async () => ({ items: await listZones() }));
export const POST = route({ auth: "admin" }, async ({ req }) => Response.json(await createZone(await readJson(req, deliveryZoneSchema)), { status: 201 }));
