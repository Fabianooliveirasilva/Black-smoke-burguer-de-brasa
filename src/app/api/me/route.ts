import { readJson, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/schemas/account";

export const GET = route({ auth: "user" }, async ({ user }) =>
  prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, phone: true, role: true } }),
);

export const PATCH = route({ auth: "user" }, async ({ req, user }) => {
  const data = await readJson(req, profileSchema);
  return prisma.user.update({ where: { id: user.id }, data, select: { name: true, email: true, phone: true } });
});
