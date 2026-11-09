import { z } from "zod";
import { cep, optText, phone, reqText } from "./common";

export const signUpSchema = z.object({
  name: reqText(80, "Informe seu nome"),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(120),
  password: z.string().min(10, "Mínimo de 10 caracteres").max(128),
});
export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha").max(128),
});
export const profileSchema = z.object({ name: reqText(80), phone: phone.nullable().optional() }).strict();

export const savedAddressSchema = z.object({
  label: reqText(40),
  street: reqText(120),
  number: reqText(20),
  complement: optText(80),
  neighborhood: reqText(80),
  city: reqText(80),
  cep,
  reference: optText(120),
  isDefault: z.boolean().default(false),
});
