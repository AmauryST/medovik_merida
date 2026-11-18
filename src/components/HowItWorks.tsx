import { BAKERY } from "@/config/bakeryOptions";

const ORDER_STEPS = [
  {
    step: 1,
    title: "Elige sabor y tamaño",
    highlight: "3 recetas · 3 formatos",
    description:
      "Medovik Clásico, Medovik Spartak o Caramelo Salado & Pecana en Rebanada (~180 g), Mediano (~1,225 kg) o Grande (~2,45 kg).",
  },
  {
    step: 2,
    title: "Pídelo con anticipación",
    highlight: "Mínimo 2 días antes",
    description:
      "Horneamos cada capa bajo pedido y dejamos reposar el pastel en frío para lograr su textura fundente. Rebanadas sujetas a disponibilidad.",
  },
  {
    step: 3,
    title: "Comparte tu fecha y zona",
    highlight: "Agenda en Mérida",
    description:
      "Al enviar tu pedido por WhatsApp revisamos disponibilidad para tu fecha y coordinamos el horario de entrega.",
  },
  {
    step: 4,
    title: "Confirma con 50% de anticipo",
    highlight: "50% anticipo · 50% al recibir",
    description:
      "Tu pedido queda reservado con el 50% de anticipo y el 50% restante se liquida al momento de la entrega.",
  },
  {
    step: 5,
    title: "Entrega a domicilio en Mérida",
    highlight: "Ruta refrigerada",
    description:
      "El costo de envío se calcula según tu dirección en Mérida (costo mínimo si coincide con ruta cercana).",
  },
];

export function HowItWorks() {
  const whatsappHref = `https://wa.me/${BAKERY.whatsappNumber}?text=${encodeURIComponent(
    "Hola Medovik Mérida, me gustaría consultar disponibilidad y hacer un pedido.",
  )}`;

  return (
    <section
      id="como-pedir"
      className="bg-blanco-calido py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Centered Editorial Header with Thin-Stroke Divider */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-cacao sm:text-4xl lg:text-5xl">
            ¿Cómo hacer tu pedido?
          </h2>
          <div
            aria-hidden="true"
            className="my-4 flex items-center justify-center gap-3 text-rosa-profundo"
          >
            <span className="h-px w-12 bg-dorado/60" />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2.5 19.5 7v10L12 21.5 4.5 17V7L12 2.5Z" />
            </svg>
            <span className="h-px w-12 bg-dorado/60" />
          </div>
          <p className="text-sm leading-relaxed text-cacao-suave sm:text-base">
            Tu Medovik será aún más delicioso si lo pides con anticipación.
            Horneamos bajo pedido para garantizar que las capas y la crema se
            fundan en su punto exacto.
          </p>
        </div>

        {/* 5 Clean Editorial Steps */}
        <div className="mt-10 divide-y divide-dorado-suave/45 rounded-2xl border border-dorado-suave/60 bg-crema/50 px-6 py-2 sm:mt-12 sm:px-8">
          {ORDER_STEPS.map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-4 py-5 sm:gap-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rosa-profundo/40 bg-blanco-calido font-serif text-lg font-bold text-rosa-profundo">
                {item.step}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl font-bold text-cacao">
                    {item.title}
                  </h3>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-rosa-profundo">
                    {item.highlight}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-cacao-suave sm:text-sm">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Concise Direct Contact Card */}
        <div className="mt-6 flex flex-col items-center justify-between gap-5 rounded-2xl border border-dorado-suave/65 bg-crema/70 p-6 text-center sm:flex-row sm:text-left">
          <div className="max-w-lg">
            <h3 className="font-serif text-2xl font-bold text-cacao">
              Atención directa
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-cacao-suave sm:text-sm">
              ¿Tienes un evento especial, necesitas consultar disponibilidad de
              rebanadas del día o cotizar envío a tu colonia?
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:flex-row">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rosa-profundo px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-blanco-calido transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-rosa-intenso active:scale-[0.97]"
            >
              <span>WhatsApp · {BAKERY.whatsapp}</span>
            </a>
            <a
              href={BAKERY.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-dorado-suave bg-blanco-calido px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-cacao transition-colors duration-200 hover:border-rosa-profundo hover:text-rosa-profundo"
            >
              <span>{BAKERY.instagramHandle}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
