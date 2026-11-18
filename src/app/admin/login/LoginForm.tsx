"use client";

import { useActionState } from "react";

import { signIn, type LoginState } from "@/lib/admin/auth-actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Correo</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          className="h-12 rounded-xl border border-stone-300 bg-white px-4"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 rounded-xl border border-stone-300 bg-white px-4"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-(--brand)">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-12 rounded-xl bg-(--brand) font-semibold text-white transition-colors hover:bg-(--brand-hover) disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
