import { notFound, readPatch, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { savedAddressSchema } from "@/schemas/account";

// Every query is scoped by userId: another user's address id returns 404 (no IDOR, no existence leak).
export const PATCH = route<{ id: string }>({ auth: "user" }, async ({ req, user, params }) => {
  const data = await readPatch(req, savedAddressSchema.partial().strict());
  const owned = await prisma.address.findFirst({ where: { id: params.id, userId: user.id } });
  if (!owned) throw notFound("Endereço");
  return prisma.$transaction(async (tx) => {
    if (data.isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    return tx.address.update({ where: { id: owned.id }, data });
  });
});

export const DELETE = route<{ id: string }>({ auth: "user" }, async ({ user, params }) => {
  const res = await prisma.address.deleteMany({ where: { id: params.id, userId: user.id } });
  if (res.count === 0) throw notFound("Endereço");
  return null;
});
