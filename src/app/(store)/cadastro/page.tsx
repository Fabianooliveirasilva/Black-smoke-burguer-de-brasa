import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default function Page() {
  return (
    <div className="mx-auto grid max-w-md px-4 pt-14 sm:px-6">
      <h1 className="display mb-8 text-7xl">Criar conta</h1>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
