"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
}

/** Email + password sign-in. Membership is checked afterwards by the panel layout. */
export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Escribe tu correo y tu contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.code === "invalid_credentials"
          ? "Correo o contraseña incorrectos."
          : "No se pudo entrar. Inténtalo de nuevo en unos minutos.",
    };
  }
  redirect("/admin/catalogo/");
}

/**
 * Starts "Sign in with Google". Supabase stores the PKCE verifier in a cookie
 * and sends Google back to /admin/auth/confirm/, which exchanges the code. An
 * account with the same verified email as a store member is linked to it;
 * any other Google account ends up signed in but denied by the panel layout.
 */
export async function signInWithGoogle(): Promise<LoginState> {
  const origin = (await headers()).get("origin");
  if (!origin) return { error: "No se pudo preparar el acceso. Recarga la página." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/admin/auth/confirm/?next=/admin/catalogo/`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    return { error: "No se pudo abrir Google. Inténtalo de nuevo." };
  }
  redirect(data.url);
}

export interface ResetState {
  error: string | null;
  sent: boolean;
}

/**
 * Emails a password-reset link. The link comes back to
 * /admin/auth/confirm/ (PKCE: open it in the same browser), which signs the
 * user in and sends them to /admin/clave/ to choose a new password. The
 * origin must be listed in Supabase → Authentication → URL Configuration.
 */
export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Escribe tu correo.", sent: false };

  const origin = (await headers()).get("origin");
  if (!origin) return { error: "No se pudo preparar el enlace. Recarga la página.", sent: false };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/admin/auth/confirm/?next=/admin/clave/`,
  });
  // Supabase answers the same whether or not the account exists.
  if (error) {
    console.error("resetPasswordForEmail", error.code, error.message);
    return { error: "No se pudo enviar el correo. Inténtalo de nuevo en unos minutos.", sent: false };
  }
  return { error: null, sent: true };
}

export interface NewPasswordState {
  error: string | null;
}

export async function setNewPassword(_prev: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 10) return { error: "Usa al menos 10 caracteres." };
  if (password !== confirm) return { error: "Las dos contraseñas no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        error.code === "weak_password" || error.code === "same_password"
          ? "Elige una contraseña más segura y distinta de la anterior."
          : "No se pudo cambiar la contraseña. Pide un enlace nuevo.",
    };
  }
  redirect("/admin/catalogo/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login/");
}
