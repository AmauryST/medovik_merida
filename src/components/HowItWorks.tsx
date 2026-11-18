import Image from "next/image";
import { BAKERY } from "@/config/bakeryOptions";
import { buildWhatsAppUrl, generalInquiryMessage } from "@/lib/whatsapp";

const STEPS = [
  {
    number: "1",
    title: "Escríbenos",
    description:
      "Por nuestro catálogo web, por WhatsApp (999 903 0512) o por mensaje directo en nuestro perfil de Instagram @medovik_merida.",
    badge: "WhatsApp o Instagram",
  },
  {
    number: "2",
    title: "Si quieres pedir una rebanada",
    description:
      "Consulta la disponibilidad del día antes de hacer tu pedido de porción individual (~180 g · $100 MXN).",
    badge: "Porción individual",
  },
  {
    number: "3",
    title: "Si quieres pedir un pastel",
    description:
      "Haz tu pedido al menos 2 días antes de la fecha en que lo necesitas (Mediano ~1,225 kg o Grande ~2,45 kg).",
    badge: "Mínimo 2 días antes",
  },
  {
    number: "4",
    title: "Anticipo del 50%",
    description:
      "Para confirmar tu pedido solicitamos el 50% de anticipo. El otro 50% lo pagas cómodamente al momento de la entrega.",
    badge: "50% anticipo · 50% al recibir",
  },
  {
    number: "5",
    title: "Entrega a domicilio en Mérida",
    description:
      "El costo de envío te lo informaremos al confirmar la dirección de entrega. Si tu pedido coincide con la ruta de otro cliente cercano, el costo de envío será mínimo.",
    badge: "Rutas compartidas con envío mínimo",
  },
];

export default function HowItWorks() {
  const whatsappHref = buildWhatsAppUrl(generalInquiryMessage());

  return (
    <section
      id="como-pedir"
      className="relative overflow-hidden border-t border-dorado-suave/50 bg-crema-oscura/45 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Encabezado */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-rosa-empolvado/55 px-4 py-1 text-xs font-semibold tracking-widest uppercase text-rosa-profundo">
            Pedir tu pastel es muy fácil
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-cacao sm:text-4xl lg:text-5xl">
            Tu Medovik{" "}
            <span className="italic text-rosa-profundo">
              con entrega a domicilio
            </span>{" "}
            ♡
          </h2>
          <p className="mt-3 text-base leading-relaxed text-cacao-suave sm:text-lg">
            Cada Medovik se hornea y ensambla artesanalmente en Mérida. Sigue
            estos 5 pasos para disfrutarlo en su punto perfecto de suavidad y
            sabor:
          </p>
        </div>

        {/* Layout principal: 5 pasos + póster oficial */}
        <div className="mt-12 grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Columna izquierda: Los 5 pasos oficiales */}
          <div className="space-y-4 lg:col-span-7">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="group relative flex items-start gap-4 rounded-2xl border border-dorado-suave/70 bg-blanco-calido p-4 sm:p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-dorado hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rosa-profundo font-serif text-xl font-bold text-blanco-calido shadow-xs">
                  {step.number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-serif text-xl font-bold text-cacao sm:text-2xl">
                      {step.title}
                    </h3>
                    <span className="rounded-full bg-rosa-empolvado/45 px-2.5 py-0.5 text-[11px] font-bold text-rosa-profundo">
                      {step.badge}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-cacao-suave sm:text-[15px]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}

            {/* Nota de reposo del Medovik + Agradecimiento */}
            <div className="rounded-2xl border border-dorado/45 bg-gradient-to-r from-rosa-empolvado/35 via-blanco-calido to-rosa-empolvado/25 p-5 shadow-xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-serif text-xl font-bold text-cacao">
                    🍯 «Tu Medovik será aún más delicioso si lo pides con
                    anticipación»
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-cacao-suave sm:text-sm">
                    El reposo en frío permite que las finas capas horneadas de
                    miel absorban la crema suave y alcancen su textura fundente
                    tradicional.{" "}
                    <strong className="text-rosa-profundo">
                      ¡Gracias por apoyar nuestro proyecto! ♡
                    </strong>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2.5">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-rosa-profundo px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-blanco-calido shadow-sm transition hover:bg-rosa-intenso"
                  >
                    Pedir por WhatsApp
                  </a>
                  <a
                    href={BAKERY.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-dorado bg-blanco-calido px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-cacao transition hover:bg-crema-oscura"
                  >
                    {BAKERY.instagramHandle}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha: Guía visual oficial de entrega a domicilio */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-3xl border border-dorado-suave/80 bg-blanco-calido p-3 shadow-md">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-crema-oscura">
                <Image
                  src="/assets/como-pedir.webp"
                  alt="Tu Medovik con entrega a domicilio — Guía oficial de 5 pasos en Mérida"
                  fill
                  sizes="(max-width: 1024px) 100vw, 460px"
                  className="object-cover"
                />
              </div>
              <div className="mt-3 flex items-center justify-between px-2 py-1 text-xs text-cacao-suave">
                <span className="font-semibold text-cacao">
                  Guía oficial de pedidos · Medovik Mérida
                </span>
                <span className="font-bold text-rosa-profundo">
                  WhatsApp {BAKERY.phone}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
