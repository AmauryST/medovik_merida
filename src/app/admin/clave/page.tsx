import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminAccess } from "@/lib/admin/session";

import { NewPasswordForm } from "./NewPasswordForm";

export const metadata: Metadata = { title: "Nueva contraseña" };

/** Reached from the reset email (already signed in by /admin/auth/confirm/). */
export default async function NewPasswordPage() {
  const access = await getAdminAccess();
  if (access.status === "signed-out") redirect("/admin/login/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-center text-2xl font-semibold">Elige tu contraseña</h1>
      <p className="mt-1 mb-8 text-center text-sm text-stone-500">
        {access.status === "ok" ? access.user.email : access.email}
      </p>
      <NewPasswordForm />
    </main>
  );
}
