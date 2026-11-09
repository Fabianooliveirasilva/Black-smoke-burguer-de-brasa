import { z } from "zod";
import { readQuery, route } from "@/lib/http";
import { dashboard } from "@/server/admin";

const q = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });
export const GET = route({ auth: "admin" }, async ({ req }) => dashboard(readQuery(req, q).days));
