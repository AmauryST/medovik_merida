import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Landing of the password-reset email and of "Sign in with Google":
 * exchanges the PKCE `code` for a session and continues to `next` (only
 * paths inside /admin/).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Google sign-in cancelled or refused (e.g. the account is not a test user).
  if (searchParams.has("error")) {
    return NextResponse.redirect(new URL("/admin/login/?acceso=fallido", request.url));
  }
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin/catalogo/";
  const target = next.startsWith("/admin/") && !next.startsWith("//") ? next : "/admin/catalogo/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(target, request.url));
    }
  }
  return NextResponse.redirect(new URL("/admin/login/?enlace=invalido", request.url));
}
