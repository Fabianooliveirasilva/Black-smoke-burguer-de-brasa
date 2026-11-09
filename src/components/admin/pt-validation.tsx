"use client";
import { useEffect } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Portuguese text for the browser's built-in constraint validation (which follows the browser's UI language). */
export function validationMessage(v: ValidityState, el: { type?: string; min?: string; max?: string; minLength?: number; maxLength?: number; title?: string }): string {
  if (v.valueMissing) return el.type === "checkbox" ? "Marque esta opção para continuar." : el.type === "file" ? "Escolha um arquivo." : "Preencha este campo.";
  if (v.typeMismatch) return el.type === "email" ? "Informe um e-mail válido." : el.type === "url" ? "Informe um endereço válido." : "Valor em formato inválido.";
  if (v.badInput) return "Informe um valor válido.";
  if (v.rangeUnderflow) return `O valor mínimo é ${el.min}.`;
  if (v.rangeOverflow) return `O valor máximo é ${el.max}.`;
  if (v.stepMismatch) return "Use um valor inteiro.";
  if (v.tooShort) return `Use pelo menos ${el.minLength} caracteres.`;
  if (v.tooLong) return `Use no máximo ${el.maxLength} caracteres.`;
  if (v.patternMismatch) return el.title || "Formato inválido.";
  return "";
}

/** Mounted once in the admin layout: every native validation bubble below it speaks Portuguese. */
export function PtValidation() {
  useEffect(() => {
    const onInvalid = (e: Event) => {
      const el = e.target as Field;
      el.setCustomValidity("");
      el.setCustomValidity(validationMessage(el.validity, el as HTMLInputElement));
    };
    // A custom message makes the field invalid until cleared, so reset it on every edit.
    const onInput = (e: Event) => (e.target as Field).setCustomValidity?.("");
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
    };
  }, []);
  return null;
}
