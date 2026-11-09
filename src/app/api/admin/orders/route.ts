import { readQuery, route } from "@/lib/http";
import { adminOrdersQuery } from "@/schemas/order";
import { listOrders } from "@/server/admin";

export const GET = route({ auth: "admin" }, async ({ req }) => listOrders(readQuery(req, adminOrdersQuery)));
