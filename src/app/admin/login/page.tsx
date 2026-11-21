import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BRAND } from "@/config/brand";
import { getAdminAccess } from "@/lib/admin/session";

import { GoogleButton } from "./GoogleButton";
import { LoginForm } from "./LoginForm";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const expired = params.enlace === "invalido";
  const oauthFailed = params.acceso === "fallido";
  const access = await getAdminAccess();
  if (access.status === "ok") {
    redirect("/admin/catalogo/");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <img src="/assets/logo.webp" alt={BRAND.storeName} className="mx-auto mb-8 h-16 w-auto" />
      <h1 className="text-center text-2xl font-semibold">Panel de la tienda</h1>
      <p className="mt-1 mb-8 text-center text-sm text-stone-500">
        Entra con la cuenta de la tienda.
      </p>
      {access.status === "denied" ? (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {access.email ? `${access.email}: ` : ""}
          {access.reason}
        </p>
      ) : null}
      {expired ? (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El enlace no es válido o ya caducó. Pide otro y ábrelo en este mismo navegador.
        </p>
      ) : null}
      {oauthFailed ? (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No se pudo entrar con Google. Usa una cuenta autorizada o inténtalo de nuevo.
        </p>
      ) : null}
      <GoogleButton />
      <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-200" />
        o con correo y contraseña
        <span className="h-px flex-1 bg-stone-200" />
      </div>
      <LoginForm />
      <ResetForm />
    </main>
  );
}

