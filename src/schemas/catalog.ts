import { z } from "zod";
import { cents, id, optText, reqText, slug } from "./common";

const imageUrl = z
  .string()
  .trim()
  .max(300)
  .regex(/^\/(images|media)\/[a-zA-Z0-9/_.-]+$/, "Imagem deve ser um arquivo enviado ou da biblioteca local");

export const productSchema = z.object({
  name: reqText(80),
  slug,
  tagline: optText(140),
  description: reqText(600),
  priceCents: cents.min(1, "Preço obrigatório"),
  imageUrl,
  categoryId: id,
  isPopular: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  allowsDoneness: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(999).default(0),
  ingredients: z
    .array(z.object({ id: id.optional(), name: reqText(60), removable: z.boolean().default(true) }))
    .max(20)
    .default([]),
  options: z
    .array(
      z.object({
        id: id.optional(),
        name: reqText(60),
        priceCents: cents,
        maxQuantity: z.number().int().min(1).max(10).default(1),
        active: z.boolean().default(true),
      }),
    )
    .max(20)
    .default([]),
});
export const productPatchSchema = productSchema.partial().strict();

export const categorySchema = z.object({
  name: reqText(60),
  slug,
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const couponBase = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,30}$/, "Use 3–30 letras ou números"),
    description: reqText(140),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.number().int().min(1),
    minOrderCents: cents.default(0),
    maxUses: z.number().int().min(1).max(1_000_000).nullable().default(null),
    startsAt: z.coerce.date().nullable().default(null),
    expiresAt: z.coerce.date().nullable().default(null),
    active: z.boolean().default(true),
});
export const couponSchema = couponBase
  .refine((c) => c.type !== "PERCENT" || c.value <= 100, { message: "Percentual deve ser 1–100", path: ["value"] })
  .refine((c) => !c.startsAt || !c.expiresAt || c.startsAt < c.expiresAt, { message: "Fim deve ser após o início", path: ["expiresAt"] });

export const deliveryZoneSchema = z.object({
  name: reqText(60),
  neighborhoods: z.array(reqText(80)).min(1, "Informe ao menos um bairro").max(60),
  feeCents: cents,
  etaMinutes: z.number().int().min(5).max(240),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
export const settingsSchema = z.object({
  name: reqText(60),
  phone: reqText(20),
  whatsapp: reqText(20),
  email: z.string().trim().email().max(120),
  street: reqText(120),
  neighborhood: reqText(80),
  city: reqText(80),
  state: z.string().trim().length(2).toUpperCase(),
  cep: z.string().trim().regex(/^\d{5}-?\d{3}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  openingHours: z
    .array(z.object({ day: z.number().int().min(0).max(6), open: hhmm, close: hhmm }).refine((w) => w.open !== w.close, "Abertura e fechamento iguais"))
    .max(21),
  ordersPaused: z.boolean(),
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  minOrderCents: cents,
  prepTimeMinutes: z.number().int().min(5).max(180),
});
