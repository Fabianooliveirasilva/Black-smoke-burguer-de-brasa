"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useMounted } from "@/hooks/use-mounted";
import { authClient, safeNext } from "@/lib/auth-client";
import { signInSchema, signUpSchema } from "@/schemas/account";

type Values = { name?: string; email: string; password: string };

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const mounted = useMounted();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(mode === "signup" ? signUpSchema : signInSchema) as never });

  const onSubmit = async (v: Values) => {
    setError(null);
    const res =
      mode === "signup"
        ? await authClient.signUp.email({ name: v.name!, email: v.email, password: v.password })
        : await authClient.signIn.email({ email: v.email, password: v.password });
    if (res.error) {
      // Generic message: never reveal whether an e-mail is registered.
      setError(
        res.error.status === 429
          ? "Muitas tentativas. Aguarde um minuto."
          : mode === "signup"
            ? "Não foi possível criar a conta com esses dados."
            : "E-mail ou senha incorretos.",
      );
      return;
    }
    // Full navigation: prefetched auth-gated routes (cached as redirects) must be re-requested with the new session.
    window.location.assign(next);
  };

  return (
    // method="post": a pre-hydration native submit must never put credentials in the URL.
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {mode === "signup" && <Field label="Nome" autoComplete="name" {...register("name")} error={errors.name?.message} />}
      <Field label="E-mail" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
      <Field
        label="Senha"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        {...register("password")}
        error={errors.password?.message}
        hint={mode === "signup" ? "Mínimo de 10 caracteres." : undefined}
      />
      {error && (
        <p className="rounded-xl bg-sangue/20 p-3 text-sm" role="alert" data-testid="auth-error">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={!mounted || isSubmitting} className="mt-2">
        {isSubmitting ? "Aguarde…" : mode === "signup" ? "Criar conta" : "Entrar"}
      </Button>
      <p className="text-sm text-fumaca">
        {mode === "signup" ? "Já tem conta? " : "Primeira vez aqui? "}
        <Link className="text-osso underline underline-offset-4" href={`${mode === "signup" ? "/entrar" : "/cadastro"}?next=${encodeURIComponent(next)}`}>
          {mode === "signup" ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}
