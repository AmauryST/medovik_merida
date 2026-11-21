import Image from "next/image";

const QUALITY_PILLARS = [
  {
    title: "Ingredientes 100% Reales",
    description:
      "Miel natural de abeja pura, mantequilla auténtica de vaca, quesos y cremas seleccionadas. Sin conservadores ni jarabes artificiales.",
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2.5 19.5 7v10L12 21.5 4.5 17V7L12 2.5Z" />
        <path d="M12 7.5v9" />
        <path d="M8.5 9.5 12 12l3.5-2.5" />
      </svg>
    ),
  },
  {
    title: "Horneado Capa por Capa",
    description:
      "Extendemos y horneamos de 8 a 10 finas capas de galleta de miel una por una hasta lograr su característico tono ámbar caramelizado.",
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3 2 8l10 5 10-5-10-5Z" />
        <path d="m2 12 10 5 10-5" />
        <path d="m2 16 10 5 10-5" />
      </svg>
    ),
  },
  {
    title: "Reposo y Textura Fundente",
    description:
      "Cada pastel reposa en frío para que la crema artesanal hidrate las capas de miel. Con 2 días de anticipación alcanza su plenitud sensorial.",
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
];

export function WhyMedovikSection() {
  return (
    <section
      id="calidad"
      className="border-b border-dorado-suave/35 bg-blanco-calido py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Centered Editorial Header with Thin-Stroke Divider — Reference Image 2 */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-cacao sm:text-4xl">
            ¿Por qué Medovik Mérida?
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
              <path d="M12 3 4 9l8 12 8-12-8-6Z" />
            </svg>
            <span className="h-px w-12 bg-dorado/60" />
          </div>
          <p className="text-sm leading-relaxed text-cacao-suave sm:text-base">
            Respetamos el tiempo, la temperatura y la nobleza de los ingredientes
            para entregarte una experiencia de alta repostería rusa en Mérida.
          </p>
        </div>

        {/* 3 Minimalist Open Columns — No bulky card borders */}
        <div className="mt-12 grid grid-cols-1 gap-10 sm:mt-16 md:grid-cols-3 md:gap-12">
          {QUALITY_PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dorado/60 bg-crema text-rosa-profundo">
                {pillar.icon}
              </div>
              <h3 className="mt-5 font-serif text-2xl font-bold text-cacao">
                {pillar.title}
              </h3>
              <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-cacao-suave">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LegendEditorialSection() {
  return (
    <section
      id="leyenda"
      className="border-y border-dorado-suave/40 bg-crema-oscura/45 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Editorial Visuals preserving the site's defining imagery */}
          <div className="grid grid-cols-12 gap-4 lg:col-span-6">
            <div className="col-span-7 overflow-hidden rounded-2xl border border-dorado-suave/60 bg-blanco-calido shadow-sm">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src="/images/clasico-porcion.webp?v=20261121"
                  alt="Rebanada artesanal de 8 capas de miel natural del pastel ruso Medovik Clásico"
                  fill
                  sizes="(max-width: 1024px) 55vw, 320px"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="col-span-5 flex flex-col justify-center">
              <div className="overflow-hidden rounded-2xl border border-dorado-suave/60 bg-blanco-calido shadow-sm">
                <div className="relative aspect-[3/4] w-full">
                  <Image
                    src="/assets/triptico-sabores.webp?v=20261121"
                    alt="Tríptico de los 3 sabores artesanales de Medovik Mérida"
                    fill
                    sizes="(max-width: 1024px) 40vw, 240px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Editorial Story & Signature — Inspired by Reference Image 3 */}
          <div className="text-center lg:col-span-6 lg:text-left">
            <h2 className="font-serif text-3xl font-bold leading-tight text-cacao sm:text-4xl">
              Una tradición imperial rusa con el toque artesanal de Mérida
            </h2>

            <div
              aria-hidden="true"
              className="my-5 flex items-center justify-center gap-3 text-rosa-profundo lg:justify-start"
            >
              <span className="h-px w-12 bg-dorado/70" />
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
              <span className="h-px w-12 bg-dorado/70" />
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-cacao-suave sm:text-[15px]">
              <p>
                Cuenta la historia que en el siglo XVIII, en la corte imperial
                rusa, la emperatriz Isabel detestaba la miel. Un joven pastelero
                 recién llegado a palacio, sin conocer aquella prohibición,
                horneó un pastel de finísimas capas doradas con miel tibia y
                crema suave.
              </p>
              <p>
                Al probarlo, las capas eran tan ligeras y su crema tan sedosa
                que la emperatriz quedó cautivada y pidió conocer el secreto.
                Cuando el joven confesó que su ingrediente principal era la miel
                pura, Isabel no solo lo perdonó: convirtió al{" "}
                <strong className="font-semibold text-cacao">Medovik</strong> en
                el postre predilecto de la corte.
              </p>
            </div>

            {/* Founder / Atelier Signature — Reference Image 3 */}
            <div className="mt-7 border-t border-dorado-suave/50 pt-5">
              <p className="font-serif text-2xl italic text-rosa-profundo">
                Medovik Mérida
              </p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-cacao-tenue">
                Repostería Rusa Artesanal · Mérida, Yucatán
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LegendAndQualitySection() {
  return (
    <>
      <WhyMedovikSection />
      <LegendEditorialSection />
    </>
  );
}

export default LegendAndQualitySection;
