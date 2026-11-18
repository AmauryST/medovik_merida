"use client";

import { useActionState } from "react";

import { setNewPassword, type NewPasswordState } from "@/lib/admin/auth-actions";

const initialState: NewPasswordState = { error: null };

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(setNewPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Nueva contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          className="h-12 rounded-xl border border-stone-300 bg-white px-4"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Repítela</span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={10}
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
        className="mt-2 h-12 rounded-xl bg-(--brand) font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar y entrar"}
      </button>
    </form>
  );
}
