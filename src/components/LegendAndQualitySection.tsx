import Image from "next/image";
import { BAKERY } from "@/config/bakeryOptions";
import { buildWhatsAppUrl, generalInquiryMessage } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./Navbar";

interface LegendAndQualitySectionProps {
  whatsappPhone?: string;
}

const QUALITY_PILLARS = [
  {
    number: "1",
    title: "Ingredientes de calidad",
    body: "Utilizamos miel natural, mantequilla de verdad, quesos y cremas de alta calidad, cacao real, nueces y frutos seleccionados. Sin saborizantes, conservadores ni potenciadores de sabor.",
  },
  {
    number: "2",
    title: "Elaboración artesanal",
    body: "Cada pastel se prepara en pequeños lotes, con procesos cuidadosos y recetas tradicionales con un toque propio, que hace la diferencia en el sabor y en la textura.",
  },
  {
    number: "3",
    title: "Tiempo y dedicación",
    body: "Nuestras finas capas se hornean, enfrían y se ensamblan una por una, con cremas suaves y equilibradas. Es un proceso que requiere varias horas, trabajo y mucha atención al detalle.",
  },
] as const;

export default function LegendAndQualitySection({
  whatsappPhone,
}: LegendAndQualitySectionProps = {}) {
  const whatsappHref = buildWhatsAppUrl(generalInquiryMessage(), whatsappPhone);

  return (
    <>
      {/* PARTE 1: La Dulce Leyenda del Medovik */}
      <section
        id="leyenda"
        aria-labelledby="leyenda-heading"
        className="relative overflow-hidden bg-[#5C151B] py-18 text-[#FBF7EF] sm:py-24"
      >
        {/* Brillos dorados imperiales */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-1/4 h-80 w-80 rounded-full bg-[#C48324]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-10 h-80 w-80 rounded-full bg-[#C48324]/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Texto de la Leyenda Imperial Rusa */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E6C48A]/40 bg-[#7D2027]/70 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-[#E6C48A]">
                <span>👑 Tradición Imperial Rusa en Mérida</span>
              </div>

              <h2
                id="leyenda-heading"
                className="mt-4 font-serif text-3xl font-bold leading-tight text-[#FFFDF9] sm:text-4xl lg:text-5xl"
              >
                La dulce leyenda del{" "}
                <span className="italic text-[#E6C48A]">Medovik</span>
              </h2>

              <blockquote className="mt-6 space-y-4 border-l-2 border-[#E6C48A]/60 pl-5 text-base leading-relaxed text-[#F7EFE0]/95 sm:text-lg">
                <p>
                  “Según una famosa leyenda rusa, un joven pastelero preparó un pastel de miel para la{" "}
                  <strong className="font-semibold text-[#E6C48A]">
                    emperatriz Isabel
                  </strong>
                  , sin saber que ella no apreciaba la miel.
                </p>
                <p>
                  Pero al probarlo, quedó encantada con sus{" "}
                  <strong className="font-semibold text-[#FFFDF9]">
                    finas capas y su delicado sabor
                  </strong>
                  . Así nació, según la leyenda, el{" "}
                  <strong className="font-semibold text-[#E6C48A]">Medovik</strong>: un pastel tradicional lleno de historia, dulzura y encanto.”
                </p>
              </blockquote>

              <p className="mt-6 text-sm leading-relaxed text-[#F7EFE0]/85 sm:text-base">
                Desde octubre trajimos esta joya de la repostería eslava a{" "}
                <strong className="text-[#FFFDF9]">Mérida, Yucatán</strong>, respetando el método clásico de hornear cada disco de galleta de miel por separado y dejar reposar el pastel para que las capas absorban la crema hasta lograr una suavidad inigualable.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#catalogo"
                  className="inline-flex items-center gap-2 rounded-full bg-[#E6C48A] px-6 py-3.5 text-sm font-bold text-[#26160C] shadow-md transition hover:bg-[#FFFDF9]"
                >
                  <span>Probar la leyenda en Mérida</span>
                </a>
                <a
                  href={BAKERY.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#E6C48A]/45 px-5 py-3 text-sm font-semibold text-[#FFFDF9] transition hover:bg-[#7D2027]"
                >
                  <span>Ver historia en {BAKERY.instagramHandle}</span>
                </a>
              </div>
            </div>

            {/* Imagen de las 10+ capas de Medovik */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border-2 border-[#E6C48A]/45 bg-[#26160C] p-2.5 shadow-2xl">
                <div className="relative aspect-square overflow-hidden rounded-2xl">
                  <Image
                    src="/assets/leyenda-medovik.webp"
                    alt="La dulce leyenda del Medovik — Pastel ruso de miel en Mérida"
                    width={847}
                    height={853}
                    sizes="(max-width: 1024px) 92vw, 440px"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PARTE 2: Preguntas Frecuentes / Los 3 Pilares de Calidad de nuestra Chef */}
      <section
        id="calidad"
        aria-labelledby="calidad-heading"
        className="bg-crema py-18 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Columna izquierda: Foto de la Chef y el póster oficial de Preguntas Frecuentes */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md">
                <div className="overflow-hidden rounded-3xl border border-dorado/40 bg-blanco-calido p-3 shadow-lg">
                  <div className="relative aspect-square overflow-hidden rounded-2xl">
                    <Image
                      src="/assets/chef-faq.webp"
                      alt="Chef de Medovik Mérida explicando los 3 elementos clave de calidad artesanal"
                      width={852}
                      height={851}
                      sizes="(max-width: 1024px) 92vw, 460px"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between px-2 py-1">
                    <div>
                      <p className="font-serif text-base font-bold text-cacao">
                        Repostería de Autor en Mérida
                      </p>
                      <p className="text-xs text-cacao-suave">
                        Fundado en octubre · Hecho en pequeños lotes
                      </p>
                    </div>
                    <span className="rounded-full bg-dorado/20 px-3 py-1 text-xs font-bold text-cacao">
                      100% Real
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha: Los 3 elementos clave */}
            <div className="lg:col-span-7">
              <span className="inline-block rounded-full bg-dorado/20 px-4 py-1 text-xs font-semibold tracking-widest uppercase text-cacao">
                Preguntas Frecuentes · Filosofía Artesanal
              </span>
              <h2
                id="calidad-heading"
                className="mt-3 font-serif text-3xl font-bold tracking-tight text-cacao sm:text-4xl"
              >
                ¿Por qué nuestros pasteles tienen un{" "}
                <span className="italic text-rosa-profundo">
                  valor y sabor diferente
                </span>
                ?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-cacao-suave">
                Después de nuestra primera exposición en Mérida y de todos sus mensajes en{" "}
                <a
                  href={BAKERY.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-rosa-profundo underline decoration-dorado/60 underline-offset-4"
                >
                  {BAKERY.instagramHandle}
                </a>
                , queremos compartir con ustedes los{" "}
                <strong className="text-cacao">tres elementos clave</strong> detrás de cada Medovik que sale de nuestra cocina:
              </p>

              <div className="mt-7 space-y-4">
                {QUALITY_PILLARS.map((pillar) => (
                  <div
                    key={pillar.number}
                    className="flex gap-4 rounded-2xl border border-dorado-suave/70 bg-blanco-calido p-5 shadow-xs transition hover:border-dorado hover:shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rosa-profundo font-serif text-lg font-bold text-blanco-calido shadow-xs">
                      {pillar.number}
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-cacao">
                        {pillar.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-cacao-suave sm:text-base">
                        {pillar.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cita de cierre */}
              <div className="mt-7 rounded-2xl border-l-4 border-rosa-profundo bg-crema-oscura/80 p-5">
                <p className="font-serif text-lg italic text-cacao sm:text-xl">
                  “En Medovik Mérida creemos que un buen pastel no solo se ve bonito, sino que se siente en cada bocado. Por eso, su precio refleja su calidad.”
                </p>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-rosa-profundo px-6 py-3.5 text-sm font-semibold text-blanco-calido shadow-sm transition hover:bg-rosa-intenso"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  <span>Hacer pedido por WhatsApp · {BAKERY.phone}</span>
                </a>
                <a
                  href={BAKERY.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-dorado/50 bg-blanco-calido px-5 py-3.5 text-sm font-semibold text-cacao transition hover:bg-crema-oscura"
                >
                  <span>Síguenos en {BAKERY.instagramHandle}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
