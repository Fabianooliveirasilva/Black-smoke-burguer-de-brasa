import { z } from "zod";

export const id = z.string().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/, "ID inválido");
const text = (max: number) => z.string().trim().max(max);
export const reqText = (max: number, msg = "Campo obrigatório") => text(max).min(1, msg);
export const optText = (max: number) =>
  text(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const phone = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => /^[1-9]{2}9?\d{8}$/.test(v), "Telefone inválido. Use DDD + número.");

export const cep = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => /^\d{8}$/.test(v), "CEP inválido");

export const cents = z.number().int().min(0).max(10_000_00);
export const slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens");
