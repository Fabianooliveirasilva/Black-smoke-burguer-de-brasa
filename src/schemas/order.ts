import { z } from "zod";
import { cep, id, optText, phone, reqText } from "./common";

export const lineSchema = z.object({
  productId: id,
  quantity: z.number().int().min(1).max(20),
  options: z.array(z.object({ optionId: id, quantity: z.number().int().min(1).max(10) })).max(20).default([]),
  removedIngredientIds: z.array(id).max(20).default([]),
  doneness: z.enum(["RARE", "MEDIUM", "WELL_DONE"]).nullable().optional(),
  notes: optText(200),
});

export const addressSchema = z.object({
  street: reqText(120, "Informe a rua"),
  number: reqText(20, "Informe o número"),
  complement: optText(80),
  neighborhood: reqText(80, "Informe o bairro"),
  city: reqText(80, "Informe a cidade"),
  cep,
  reference: optText(120),
});

const base = z.object({
  customer: z.object({
    name: reqText(80, "Informe seu nome").refine((v) => v.length >= 2, "Nome muito curto"),
    phone,
    email: z.string().trim().email("E-mail inválido").max(120).optional().or(z.literal("")).transform((v) => v || null),
  }),
  items: z.array(lineSchema).min(1, "Carrinho vazio").max(30),
  paymentMethod: z.enum(["PIX", "CARD_ONLINE", "CARD_ON_DELIVERY", "CASH"]),
  changeForCents: z.number().int().min(0).max(100_000).nullable().optional(),
  couponCode: z.string().trim().toUpperCase().max(30).optional().nullable().transform((v) => v || null),
  notes: optText(300),
});

export const createOrderSchema = z.discriminatedUnion("fulfillment", [
  base.extend({ fulfillment: z.literal("DELIVERY"), deliveryZoneId: id, address: addressSchema }),
  base.extend({ fulfillment: z.literal("PICKUP") }),
]);
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const validateCouponSchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(30),
  items: z.array(lineSchema).min(1).max(30),
});

export const updateStatusSchema = z.object({
  status: z.enum(["RECEIVED", "PREPARING", "ASSEMBLING", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "DELIVERED", "CANCELED"]),
  note: optText(200),
});

export const adminOrdersQuery = z.object({
  status: z.enum(["RECEIVED", "PREPARING", "ASSEMBLING", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "DELIVERED", "CANCELED", "ACTIVE"]).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
