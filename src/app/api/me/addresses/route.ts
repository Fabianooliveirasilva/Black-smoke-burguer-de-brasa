import { HttpError, readJson, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { savedAddressSchema } from "@/schemas/account";

const MAX_ADDRESSES = 10;

export const GET = route({ auth: "user" }, async ({ user }) => ({
  addresses: await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
}));

export const POST = route({ auth: "user" }, async ({ req, user }) => {
  const data = await readJson(req, savedAddressSchema);
  const count = await prisma.address.count({ where: { userId: user.id } });
  if (count >= MAX_ADDRESSES) throw new HttpError(422, "LIMIT", "Limite de 10 endereços.");
  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault || count === 0) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    return tx.address.create({ data: { ...data, isDefault: data.isDefault || count === 0, userId: user.id } });
  });
  return Response.json(address, { status: 201 });
});
