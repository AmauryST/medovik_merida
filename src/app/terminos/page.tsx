import Link from "next/link";
import { BRAND } from "@/config/brand";

export const metadata = {
  title: `Términos y Condiciones | ${BRAND.storeName}`,
  description: `Términos y condiciones de compra y pedidos artesanales de ${BRAND.storeName} en Mérida, Yucatán, México.`,
};

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-crema px-4 py-14 text-cacao sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-dorado-suave/70 bg-blanco-calido p-6 shadow-xs sm:p-10">
        <span className="inline-block rounded-full bg-rosa-empolvado/55 px-3.5 py-1 text-xs font-semibold tracking-widest uppercase text-rosa-profundo">
          Condiciones de Compra
        </span>
        <h1 className="mt-3 font-serif text-3xl font-bold text-cacao sm:text-4xl">
          Términos y Condiciones de Servicio
        </h1>
        <p className="mt-2 text-xs text-cacao-suave">
          {BRAND.storeName} · {BRAND.city}
        </p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-cacao-suave">
          <section>
            <h2 className="font-serif text-xl font-bold text-cacao">
              1. Elaboración artesanal bajo pedido
            </h2>
            <p className="mt-1.5">
              En <strong>{BRAND.storeName}</strong> elaboramos cada pastel ruso
              de miel (Medovik Clásico, Spartak y Caramelo Salado) en pequeños
              lotes artesanales con ingredientes naturales, sin conservadores ni
              saborizantes artificiales.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-cacao">
              2. Precios y moneda (MXN)
            </h2>
            <p className="mt-1.5">
              Todos los precios publicados en nuestro sitio web están expresados
              en <strong>Pesos Mexicanos (MXN)</strong>:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Medovik Clásico:</strong> Grande (~2,45 kg) $1,000 MXN ·
                Mediano (~1,225 kg) $500 MXN · Porción (~180 g) $100 MXN.
              </li>
              <li>
                <strong>Medovik Spartak (Miel, Cacao, Ciruela y Nuez):</strong>{" "}
                Grande (~2,45 kg) $1,200 MXN · Mediano (~1,225 kg) $600 MXN ·
                Porción (~180 g) $100 MXN.
              </li>
              <li>
                <strong>Medovik Caramelo Salado &amp; Nuez Pecana:</strong>{" "}
                Grande (~2,45 kg) $1,200 MXN · Mediano (~1,225 kg) $600 MXN ·
                Porción (~180 g) $100 MXN.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-cacao">
              3. Anticipación de pedidos y disponibilidad de rebanadas
            </h2>
            <p className="mt-1.5">
              • <strong>Si deseas pedir una rebanada (~180 g):</strong> Consulta
              la disponibilidad del día por WhatsApp ({BRAND.phone}) o Instagram (
              {BRAND.instagramHandle}) antes de realizar tu pedido.
              <br />• <strong>Si deseas pedir un pastel completo (Mediano o Grande):</strong>{" "}
              Realiza tu pedido con <strong>al menos 2 días de anticipación</strong>{" "}
              a la fecha en que lo necesitas. Tu Medovik será aún más delicioso
              cuando se prepara y reposa con anticipación.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-cacao">
              4. Anticipo del 50% y liquidación a la entrega
            </h2>
            <p className="mt-1.5">
              Para confirmar cualquier pedido solicitamos un{" "}
              <strong>anticipo del 50%</strong> (mediante transferencia SPEI o
              el medio acordado por WhatsApp). El{" "}
              <strong>otro 50% se paga al momento de la entrega</strong>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-cacao">
              5. Entrega a domicilio en Mérida y rutas compartidas
            </h2>
            <p className="mt-1.5">
              El costo de envío a domicilio en {BRAND.city} te lo informaremos al
              confirmar la dirección exacta de entrega.{" "}
              <strong>
                Si tu pedido coincide con la ruta de otro cliente cercano, el
                costo de envío será mínimo.
              </strong>
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-cacao">
              6. Conservación del producto
            </h2>
            <p className="mt-1.5">
              Por estar elaborado con mantequilla auténtica, quesos y cremas
              naturales sin conservadores, el Medovik debe mantenerse en{" "}
              <strong>refrigeración (entre 2 °C y 6 °C)</strong> hasta el
              momento de servirse.
            </p>
          </section>
        </div>

        <div className="mt-8 border-t border-dorado-suave/60 pt-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-rosa-profundo hover:underline"
          >
            ← Volver al inicio de {BRAND.storeName}
          </Link>
        </div>
      </div>
    </main>
  );
}
