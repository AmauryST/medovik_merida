import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { StoreMemberRole } from "@/types/admin";
import type { Uuid } from "@/types/catalog";

export interface AdminStore {
  id: Uuid;
  slug: string;
  name: string;
  currency?: string;
}

export interface AdminContext {
  /** Client with the member's session: every read and write goes through RLS. */
  supabase: SupabaseClient;
  user: { id: Uuid; email: string | null };
  store: AdminStore;
  role: StoreMemberRole;
}

export type AdminAccess =
  | { status: "signed-out" }
  | { status: "denied"; email: string | null; reason: string }
  | ({ status: "ok" } & AdminContext);

/**
 * Who is signed in and whether they belong to this deployment's store
 * (`NEXT_PUBLIC_STORE_SLUG`) through `store_members`. Cached per request.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  const supabase = await createClient();

  // getUser() validates the JWT with Supabase Auth (getSession() would trust the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "signed-out" };
  }
  const email = user.email ?? null;

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug, name, currency")
    .eq("slug", supabaseEnv.storeSlug)
    .maybeSingle<AdminStore>();
  if (storeError || !store) {
    return { status: "denied", email, reason: "No se encontró la tienda." };
  }

  const { data: member, error: memberError } = await supabase
    .from("store_members")
    .select("role")
    .eq("store_id", store.id)
    .eq("user_id", user.id)
    .maybeSingle<{ role: StoreMemberRole }>();
  if (memberError) {
    console.error("store_members", memberError.code, memberError.message);
    return { status: "denied", email, reason: "No se pudo comprobar el acceso. Recarga la página." };
  }
  if (!member) {
    return { status: "denied", email, reason: "Esta cuenta no es miembro de la tienda." };
  }

  return {
    status: "ok",
    supabase,
    user: { id: user.id, email },
    store,
    role: member.role,
  };
});

/** For pages and Server Actions: the admin context, or a redirect to the login page. */
export async function requireAdmin(): Promise<AdminContext> {
  const access = await getAdminAccess();
  if (access.status !== "ok") {
    redirect("/admin/login/");
  }
  return access;
}
