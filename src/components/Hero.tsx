import Image from "next/image";

const HERO_RECIPES = [
  {
    number: "01",
    title: "Medovik Clásico",
    note: "Receta imperial · Miel natural y crema suave",
  },
  {
    number: "02",
    title: "Medovik Spartak",
    note: "Cacao real, ciruela pasa y nuez tostada",
  },
  {
    number: "03",
    title: "Caramelo Salado & Pecana",
    note: "Caramelo artesanal y nuez pecana crujiente",
  },
];

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-[560px] flex-col justify-between overflow-hidden bg-cacao text-blanco-calido sm:min-h-[640px] lg:min-h-[700px]"
    >
      {/* Full-bleed Atmospheric Hero Image (/assets/hero.webp) */}
      <div className="absolute inset-0">
        <Image
          src="/assets/hero.webp"
          alt="Pastel ruso artesanal de miel Medovik Mérida con finas capas doradas"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-cacao/75 via-cacao/60 to-cacao/85"
        />
      </div>

      {/* Centered Editorial Copy & Single Solid CTA — Inspired by Reference Images 1 & 2 */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16">
        <h1 className="font-serif text-4xl font-bold leading-[1.08] tracking-tight text-blanco-calido sm:text-5xl lg:text-6xl">
          Medovik Mérida: El Auténtico Pastel Ruso de Miel
        </h1>

        {/* Subtle Divider Line with Custom Thin-Stroke Bakery Emblem Icon */}
        <div
          aria-hidden="true"
          className="my-5 flex items-center justify-center gap-3 text-dorado-suave/90 sm:my-6"
        >
          <span className="h-px w-12 bg-dorado-suave/50 sm:w-16" />
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2.5 19.5 7v10L12 21.5 4.5 17V7L12 2.5Z" />
            <path d="M12 8v8" />
            <path d="M8.5 10 12 12l3.5-2" />
          </svg>
          <span className="h-px w-12 bg-dorado-suave/50 sm:w-16" />
        </div>

        <p className="max-w-xl text-sm leading-relaxed font-normal text-crema/90 sm:text-base">
          Ocho a diez finas capas de miel natural de abeja horneadas una por una
          y ensambladas con crema artesanal que se funde en el paladar.
          Horneado bajo pedido en Mérida en tres recetas y tres formatos.
        </p>

        {/* Single Centered Primary CTA */}
        <div className="mt-8">
          <a
            href="#catalogo"
            className="inline-flex items-center justify-center rounded-full bg-rosa-profundo px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-blanco-calido shadow-md transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-rosa-intenso active:scale-[0.97]"
          >
            Explorar Pasteles
          </a>
        </div>
      </div>

      {/* 3-Column Translucent Dark Bottom Overlay Bar — Inspired by Reference Image 2 */}
      <div className="relative z-10 border-t border-dorado-suave/25 bg-cacao/75 backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-dorado-suave/20 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          {HERO_RECIPES.map((recipe) => (
            <a
              key={recipe.number}
              href="#catalogo"
              className="group flex items-center gap-4 px-3 py-4 transition-colors duration-200 hover:bg-blanco-calido/5 sm:px-6 sm:py-5"
            >
              <span className="font-serif text-2xl font-bold text-dorado-suave transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5 sm:text-3xl">
                {recipe.number}.
              </span>
              <div className="min-w-0">
                <p className="font-serif text-lg font-bold leading-snug text-blanco-calido group-hover:text-dorado-suave">
                  {recipe.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-crema/75">
                  {recipe.note}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Hero;
