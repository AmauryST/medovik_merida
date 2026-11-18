import Link from "next/link";
import { redirect } from "next/navigation";

import { getActiveStore } from "@/lib/catalog/queries";
import {
  decryptOrderTrackingToken,
  encryptOrderTrackingToken,
  extractTrackingTokenCandidate,
  isPlainOrderCode,
} from "@/lib/orders/tracking-token";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ codigo?: string; error?: string }>;
}

export default async function OrderLookupPage({ searchParams }: Props) {
  const [{ codigo, error }, store] = await Promise.all([
    searchParams,
    getActiveStore(),
  ]);

  let validationError: "plain_code" | "invalid_token" | null = null;

  if (codigo && codigo.trim()) {
    const candidate = extractTrackingTokenCandidate(codigo);
    if (isPlainOrderCode(candidate)) {
      validationError = "plain_code";
    } else {
      const verifiedOrderCode = decryptOrderTrackingToken(candidate, store.id);
      if (verifiedOrderCode) {
        const canonicalToken = encryptOrderTrackingToken(
          verifiedOrderCode,
          store.id,
        );
        redirect(`/pedido/${encodeURIComponent(canonicalToken)}`);
      }
      validationError = "invalid_token";
    }
  } else if (error === "plain_code") {
    validationError = "plain_code";
  } else if (error) {
    validationError = "invalid_token";
  }

  return (
    <main className="min-h-screen bg-crema px-4 py-12 text-cacao">
      <div className="mx-auto max-w-lg rounded-3xl border border-dorado-suave/70 bg-blanco-calido p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <p className="m-0 text-xs font-semibold tracking-[0.2em] uppercase text-rosa-profundo">
            {store.name} · Mérida, Yucatán
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">
            Seguimiento de Pedido
          </h1>
          <p className="mt-2 text-sm text-cacao-suave">
            Ingresa tu código encriptado de validación (o pega el enlace de
            seguimiento enviado a tu WhatsApp o correo) para consultar el
            estado de tu pedido en Mérida, Yucatán.
          </p>
        </div>

        {validationError === "plain_code" && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-center text-sm text-amber-950">
            Por seguridad y privacidad, ingresa la{" "}
            <strong>cadena encriptada de validación</strong> o abre el enlace
            directo recibido al confirmar tu pedido.
          </div>
        )}

        {validationError === "invalid_token" && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-center text-sm text-rose-900">
            La cadena encriptada de validación no es válida o está incompleta.
            Verifica que hayas copiado el código o enlace completo de tu pedido.
          </div>
        )}

        <form action="/pedido" method="GET" className="space-y-4">
          <div>
            <label
              htmlFor="order-code-input"
              className="mb-1.5 block text-xs font-bold tracking-wider uppercase text-cacao-suave"
            >
              Código encriptado de validación o enlace de seguimiento
            </label>
            <input
              id="order-code-input"
              name="codigo"
              required
              autoComplete="off"
              spellCheck={false}
              defaultValue={codigo ?? ""}
              placeholder="Ej. pega aquí tu código encriptado o enlace /pedido/..."
              className="h-12 w-full rounded-xl border border-dorado-suave bg-crema px-4 font-mono text-sm font-semibold text-cacao placeholder:font-sans placeholder:font-normal placeholder:text-cacao-suave/60 focus:border-rosa-profundo focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-rosa-profundo text-sm font-extrabold text-blanco-calido shadow-sm transition hover:bg-rosa-intenso"
          >
            Validar y consultar mi pedido
          </button>
        </form>

        <div className="mt-6 border-t border-dorado-suave/50 pt-5 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-cacao-suave no-underline hover:text-rosa-profundo"
          >
            ← Volver a {store.name}
          </Link>
        </div>
      </div>
    </main>
  );
}
