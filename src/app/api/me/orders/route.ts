import { route } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = route({ auth: "user" }, async ({ user }) => ({
  orders: await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { number: true, trackingToken: true, status: true, totalCents: true, createdAt: true, fulfillment: true, items: { select: { productName: true, quantity: true } } },
  }),
}));
