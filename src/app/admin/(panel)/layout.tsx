import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { signOut } from "@/lib/admin/auth-actions";
import { getAdminAccess } from "@/lib/admin/session";

import { AdminNav } from "./AdminNav";

/** Shell of the four sections: header, content, bottom tab bar (mobile first). */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const access = await getAdminAccess();
  if (access.status === "signed-out") {
    redirect("/admin/login/");
  }

  if (access.status === "denied") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">Sin acceso</h1>
        <p className="text-sm text-stone-600">
          {access.email ? `${access.email}: ` : ""}
          {access.reason}
        </p>
        <form action={signOut}>
          <button type="submit" className="h-11 rounded-xl border border-stone-300 px-5 text-sm font-medium">
            Salir
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight">{access.store.name}</p>
            <p className="truncate text-xs text-stone-500">{access.user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="h-9 rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <AdminNav />
    </div>
  );
}
