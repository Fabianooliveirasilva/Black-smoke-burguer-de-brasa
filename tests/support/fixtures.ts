import { prisma } from "@/lib/prisma";
import type { CreateOrderInput } from "@/schemas/order";

export async function catalog() {
  const smoke = await prisma.product.findUniqueOrThrow({ where: { slug: "smoke-classic" }, include: { options: true, ingredients: true } });
  const fries = await prisma.product.findUniqueOrThrow({ where: { slug: "fritas-da-casa" } });
  const zone = await prisma.deliveryZone.findFirstOrThrow({ where: { name: "Pinheiros e Vila Madalena" } });
  return { smoke, fries, zone };
}

export async function deliveryInput(over: Partial<CreateOrderInput> = {}): Promise<CreateOrderInput> {
  const { smoke, zone } = await catalog();
  return {
    fulfillment: "DELIVERY",
    deliveryZoneId: zone.id,
    address: { street: "Rua Teodoro Sampaio", number: "100", complement: null, neighborhood: "pinheiros", city: "São Paulo", cep: "05405000", reference: null },
    customer: { name: "Cliente Teste", phone: "11912345678", email: "cliente@test.local" },
    items: [
      {
        productId: smoke.id,
        quantity: 2,
        options: [{ optionId: smoke.options.find((o) => o.name.startsWith("Bacon"))!.id, quantity: 1 }],
        removedIngredientIds: [smoke.ingredients.find((i) => i.removable)!.id],
        doneness: "RARE",
        notes: "sem pressa",
      },
    ],
    paymentMethod: "CASH",
    changeForCents: null,
    couponCode: null,
    notes: null,
    ...over,
  } as CreateOrderInput;
}
