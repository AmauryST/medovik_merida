import type { Metadata } from "next";
import Link from "next/link";
import { BAKERY } from "@/config/bakeryOptions";

export const metadata: Metadata = {
  title: `Política de Privacidad | ${BAKERY.name}`,
  description: `Aviso de privacidad y protección de datos personales de ${BAKERY.name} en Mérida, Yucatán, México.`,
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-crema py-14 px-4 sm:px-6 lg:px-8 text-cacao">
      <div className="mx-auto max-w-3xl rounded-3xl border border-dorado-suave/60 bg-blanco-calido p-8 shadow-sm sm:p-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-rosa-profundo hover:underline"
        >
          ← Volver al inicio
        </Link>

        <h1 className="mt-6 font-serif text-3xl font-bold text-cacao sm:text-4xl">
          Aviso de Privacidad
        </h1>
        <p className="mt-2 text-xs text-cacao-suave">
          Última actualización: Noviembre 2026 · {BAKERY.city}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-cacao-suave sm:text-base">
          <section>
            <h2 className="font-serif text-xl font-bold text-cacao">
              1. Responsable del tratamiento de tus datos
            </h2>
            <p className="mt-2">
              <strong>{BAKERY.name}</strong> ({BAKERY.tagline}), con operación en{" "}
              <strong>{BAKERY.city}</strong> y contacto oficial vía WhatsApp al{" "}
              <strong>+52 {BAKERY.phone}</strong> e Instagram{" "}
              <strong>{BAKERY.instagramHandle}</strong>, es responsable del uso y protección de los datos personales que nos proporcionas al realizar o cotizar un pedido.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-cacao">
              2. Datos que recopilamos
            </h2>
            <p className="mt-2">
              Para preparar y coordinar tu pedido en Mérida solicitamos únicamente: nombre de contacto, número de teléfono/WhatsApp, correo electrónico (opcional), dirección o colonia de entrega en Mérida (o punto de recolección acordado), fecha/horario deseado y dedicatoria o notas de alergias.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-cacao">
              3. Finalidad del uso de la información
            </h2>
            <p className="mt-2">
              Tus datos se utilizan exclusivamente para: (a) confirmar la disponibilidad y elaboración artesanal de tu pastel Medovik, (b) coordinar la entrega o recolección en Mérida, Yucatán, y (c) enviarte actualizaciones sobre el estado de tu pedido. No vendemos ni cedemos tus datos a terceros.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-cacao">
              4. Derechos ARCO y contacto
            </h2>
            <p className="mt-2">
              En cualquier momento puedes solicitar el acceso, rectificación, cancelación u oposición (derechos ARCO) respecto a tus datos personales escribiéndonos directamente por WhatsApp al{" "}
              <a
                href={`https://wa.me/${BAKERY.whatsappNumber}`}
                className="font-semibold text-rosa-profundo underline"
              >
                +52 {BAKERY.phone}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
