"use client";

import { useActionState, useState } from "react";

import { requestPasswordReset, type ResetState } from "@/lib/admin/auth-actions";

const initialState: ResetState = { error: null, sent: false };

/** "Forgot your password?": collapsed link that opens an email-only form. */
export function ResetForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-6 text-sm font-medium text-stone-600 underline">
        ¿Olvidaste tu contraseña o es tu primera vez?
      </button>
    );
  }

  if (state.sent) {
    return (
      <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Si el correo es de una cuenta de la tienda, te llegó un enlace. Ábrelo en este mismo navegador para elegir
        tu contraseña.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Correo de la cuenta</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
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
        className="h-11 rounded-xl border border-stone-300 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviarme un enlace"}
      </button>
    </form>
  );
}
