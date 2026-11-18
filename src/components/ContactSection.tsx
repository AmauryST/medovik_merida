import Image from "next/image";
import { BAKERY } from "@/config/bakeryOptions";
import { buildWhatsAppUrl, generalInquiryMessage } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./Navbar";
import EmailContactForm from "./EmailContactForm";

interface ContactSectionProps {
  whatsappPhone?: string;
}

export default function ContactSection({ whatsappPhone }: ContactSectionProps = {}) {
  const whatsappHref = buildWhatsAppUrl(generalInquiryMessage(), whatsappPhone);

  return (
    <section
      id="contacto"
      aria-labelledby="contacto-heading"
      className="relative overflow-hidden bg-gradient-to-br from-crema-oscura via-rosa-empolvado/40 to-crema py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-blanco-calido px-4 py-1 text-xs font-semibold tracking-widest uppercase text-rosa-profundo shadow-2xs">
            Pedidos en Mérida, Yucatán
          </span>
          <h2
            id="contacto-heading"
            className="mt-3 font-serif text-3xl font-bold tracking-tight text-cacao sm:text-4xl lg:text-5xl"
          >
            ¿Qué Medovik se te antoja hoy?
          </h2>
          <p className="mt-3 text-base text-cacao-suave sm:text-lg">
            Escríbenos por WhatsApp al <strong className="text-cacao">{BAKERY.phone}</strong> o síguenos en Instagram{" "}
            <a
              href={BAKERY.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-rosa-profundo underline decoration-dorado/60 underline-offset-4"
            >
              {BAKERY.instagramHandle}
            </a>{" "}
            para conocer nuestras próximas exposiciones y horneadas en Mérida.
          </p>
        </div>

        {/* Grid de dos columnas: canales rápidos + formulario */}
        <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-12">
          {/* Columna izquierda: WhatsApp + Menú Oficial + Instagram */}
          <div className="flex flex-col justify-between rounded-3xl border border-dorado-suave/70 bg-blanco-calido p-7 shadow-lg sm:p-9 lg:col-span-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-rosa-empolvado/60 px-3.5 py-1 text-xs font-semibold text-rosa-profundo">
                <span className="h-2 w-2 rounded-full bg-rosa-profundo" />
                Atención directa en Mérida
              </span>
              <h3 className="mt-4 font-serif text-2xl font-bold text-cacao sm:text-3xl">
                Pedidos por WhatsApp
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-cacao-suave sm:text-base">
                Atendemos personalmente cada pedido para recomendarte el tamaño ideal (Grande ~2.45 kg, Mediano ~1.225 kg o Porciones ~180 g) y coordinar tu fecha de entrega en Mérida.
              </p>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-rosa-profundo px-6 py-4 text-base font-semibold text-blanco-calido shadow-md transition-all hover:-translate-y-0.5 hover:bg-rosa-intenso hover:shadow-lg"
              >
                <WhatsAppIcon className="h-5 w-5" />
                <span>WhatsApp · {BAKERY.phone}</span>
              </a>

              {/* Mini vista de la carta menú oficial */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-dorado/35 bg-crema p-2.5">
                <div className="flex items-center gap-3">
                  <Image
                    src="/assets/logo-emblem.webp"
                    alt="Medovik Mérida"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full border border-dorado/40 object-cover"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">
                      Resumen de precios (MXN)
                    </p>
                    <p className="text-xs text-cacao-suave">
                      Porción ~180 g: <strong className="text-cacao">$100</strong> · Mediano ~1.22 kg: <strong className="text-cacao">$500–$600</strong> · Grande ~2.45 kg: <strong className="text-cacao">$1,000–$1,200</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Datos de contacto directo */}
            <dl className="mt-8 space-y-4 border-t border-dorado-suave/60 pt-6 text-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crema-oscura text-rosa-profundo">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <div>
                  <dt className="text-xs font-semibold tracking-wider uppercase text-cacao-suave">
                    Pedidos por WhatsApp (México)
                  </dt>
                  <dd className="font-semibold text-cacao">
                    <a href={`tel:${BAKERY.whatsapp}`} className="hover:text-rosa-profundo">
                      +52 {BAKERY.phone}
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crema-oscura text-rosa-profundo">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </span>
                <div>
                  <dt className="text-xs font-semibold tracking-wider uppercase text-cacao-suave">
                    Síguenos en Instagram (Fundado en Octubre)
                  </dt>
                  <dd className="font-semibold text-cacao">
                    <a
                      href={BAKERY.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-rosa-profundo"
                    >
                      {BAKERY.instagramHandle}
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crema-oscura text-rosa-profundo">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <div>
                  <dt className="text-xs font-semibold tracking-wider uppercase text-cacao-suave">
                    Ubicación
                  </dt>
                  <dd className="font-semibold text-cacao">{BAKERY.city}</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Columna derecha: formulario */}
          <div className="rounded-3xl border border-dorado-suave/70 bg-blanco-calido p-7 shadow-lg sm:p-9 lg:col-span-7">
            <EmailContactForm whatsappPhone={whatsappPhone} />
          </div>
        </div>
      </div>
    </section>
  );
}
