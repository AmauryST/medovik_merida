"use client";

import Image from "next/image";
import { BAKERY } from "@/config/bakeryOptions";
import { buildWhatsAppUrl, generalInquiryMessage } from "@/lib/whatsapp";
import { formatCents, type CatalogProduct } from "@/types/catalog";
import { SlotImage } from "@/components/SlotImage";
import { useOptionalCart } from "@/components/catalog/CartContext";
import { WhatsAppIcon } from "./Navbar";

interface HeroProps {
  whatsappPhone?: string;
  products?: CatalogProduct[];
  featuredProducts?: CatalogProduct[];
  onSelectProduct?: (product: CatalogProduct) => void;
}

export default function Hero({
  whatsappPhone,
  products = [],
  featuredProducts = [],
  onSelectProduct,
}: HeroProps = {}) {
  const cart = useOptionalCart();
  const whatsappHref = buildWhatsAppUrl(generalInquiryMessage(), whatsappPhone);
  const pool = featuredProducts.length > 0 ? featuredProducts : products;
  const showcaseProducts = pool.slice(0, 3);

  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-honey-pattern pt-6 pb-14 sm:pt-12 sm:pb-22"
    >
      {/* Destellos cálidos de miel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-rosa-empolvado/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-dorado-suave/50 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Columna de texto */}
          <div className="text-center lg:col-span-7 lg:text-left">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-dorado/45 bg-blanco-calido/90 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-rosa-profundo shadow-xs lg:justify-start">
              <span className="h-2 w-2 rounded-full bg-dorado" />
              <span>Mérida, Yucatán · 3 Recetas Artesanales × 3 Formatos</span>
            </div>

            <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight text-cacao sm:text-5xl lg:text-6xl">
              El auténtico{" "}
              <span className="italic text-rosa-profundo">
                Pastel Ruso de Miel
              </span>{" "}
              hecho artesanalmente en Mérida
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-cacao-suave sm:text-lg lg:mx-0">
              Finas capas horneadas una por una con{" "}
              <strong className="font-semibold text-cacao">
                miel natural, mantequilla de verdad, cacao real y frutos
                seleccionados
              </strong>
              , ensambladas con cremas suaves y horas de reposo. Conoce nuestras{" "}
              <strong className="font-semibold text-cacao">
                3 especialidades (Clásico, Spartak y Caramelo Salado)
              </strong>{" "}
              en Rebanada, Pastel Mediano o Pastel Grande y conforma tu pedido en
              línea.
            </p>

            {/* Resumen de los 3 formatos */}
            <div className="mt-6 grid grid-cols-1 gap-2.5 text-left sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-xl border border-dorado-suave/70 bg-blanco-calido/85 px-3 py-2 shadow-2xs">
                <span className="text-base" aria-hidden="true">
                  🍰
                </span>
                <div>
                  <p className="text-xs font-bold text-cacao">
                    Rebanada (~180 g)
                  </p>
                  <p className="text-[11px] text-cacao-suave">
                    {cart?.showPrices
                      ? "Porción individual · $100 MXN"
                      : "1 porción · Disponibilidad del día"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-dorado-suave/70 bg-blanco-calido/85 px-3 py-2 shadow-2xs">
                <span className="text-base" aria-hidden="true">
                  🎂
                </span>
                <div>
                  <p className="text-xs font-bold text-cacao">
                    Mediano (~1.225 kg)
                  </p>
                  <p className="text-[11px] text-cacao-suave">
                    {cart?.showPrices
                      ? "8 a 10 porciones · Desde $500 MXN"
                      : "8 a 10 porciones · Mín. 2 días antes"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-dorado-suave/70 bg-blanco-calido/85 px-3 py-2 shadow-2xs">
                <span className="text-base" aria-hidden="true">
                  👑
                </span>
                <div>
                  <p className="text-xs font-bold text-cacao">
                    Grande (~2.45 kg)
                  </p>
                  <p className="text-[11px] text-cacao-suave">
                    {cart?.showPrices
                      ? "16 a 20 porciones · Desde $1,000 MXN"
                      : "16 a 20 porciones · Mín. 2 días antes"}
                  </p>
                </div>
              </div>
            </div>

            {/* CTAs principales */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row lg:justify-start">
              <a
                href="#catalogo"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rosa-profundo px-7 py-4 text-base font-semibold text-blanco-calido shadow-md transition-all hover:-translate-y-0.5 hover:bg-rosa-intenso hover:shadow-lg sm:w-auto"
              >
                <span>Ver los 3 Pasteles y Conformar Pedido</span>
                <span aria-hidden="true">↓</span>
              </a>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-dorado bg-blanco-calido/85 px-6 py-3.5 text-base font-semibold text-cacao transition-all hover:border-rosa-profundo hover:bg-blanco-calido sm:w-auto"
              >
                <WhatsAppIcon className="h-5 w-5 text-rosa-profundo" />
                <span>WhatsApp {BAKERY.phone}</span>
              </a>
            </div>

            {/* Sellos de autenticidad */}
            <dl className="mt-9 grid grid-cols-3 gap-3 border-t border-dorado-suave/70 pt-6 text-center lg:text-left">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-cacao-suave">
                  100% Real
                </dt>
                <dd className="mt-0.5 font-serif text-lg font-bold text-cacao sm:text-xl">
                  Miel y Mantequilla
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-cacao-suave">
                  Sin Químicos
                </dt>
                <dd className="mt-0.5 font-serif text-lg font-bold text-cacao sm:text-xl">
                  0% Conservadores
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-cacao-suave">
                  Comunidad
                </dt>
                <dd className="mt-0.5 font-serif text-lg font-bold text-rosa-profundo sm:text-xl">
                  {BAKERY.instagramHandle}
                </dd>
              </div>
            </dl>
          </div>

          {/* Columna de imagen principal + las 3 especialidades */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative overflow-hidden rounded-[2rem] border-2 border-dorado/45 bg-blanco-calido p-3 shadow-xl">
                <a
                  href="#catalogo"
                  aria-label="Ver catálogo de pasteles Medovik en Mérida"
                  className="group relative block aspect-[4/4] overflow-hidden rounded-[1.5rem] bg-crema-oscura"
                >
                  <Image
                    src="/assets/hero-clasico-higos.webp"
                    alt="Medovik Clásico con Higos Frescos y Miel Natural — Medovik Mérida"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 480px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-cacao/80 via-cacao/25 to-transparent p-5 text-blanco-calido">
                    <span className="inline-block rounded-full bg-dorado/90 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blanco-calido">
                      Receta Tradicional Rusa
                    </span>
                    <p className="mt-1 font-serif text-xl font-semibold">
                      Capas finas de miel y crema artesanal
                    </p>
                    <p className="text-xs text-crema/90">
                      Elige Rebanada, Mediano o Grande en nuestras 3 recetas →
                    </p>
                  </div>
                </a>

                {/* Las 3 especialidades debajo de la foto principal */}
                {showcaseProducts.length > 0 && (
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    {showcaseProducts.map((product) => {
                      const showPrice = cart?.isPriceVisibleFor(product) ?? false;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => onSelectProduct?.(product)}
                          className="group/mini relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-dorado-suave/50 bg-crema/70 p-1.5 text-left transition-all hover:-translate-y-0.5 hover:border-dorado hover:bg-blanco-calido hover:shadow-sm"
                        >
                          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-crema-oscura">
                            <SlotImage
                              product={product}
                              slot="PRODUCT_PRIMARY"
                              sizes="130px"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover/mini:scale-108"
                            />
                            <span className="absolute right-1 bottom-1 rounded-full bg-cacao/90 px-2 py-0.5 text-[10px] font-bold text-blanco-calido shadow-xs">
                              {showPrice
                                ? `$${formatCents(product.price_cents)} MXN`
                                : "3 formatos"}
                            </span>
                          </div>
                          <span className="mt-1.5 line-clamp-1 px-0.5 text-[11px] font-semibold text-cacao group-hover/mini:text-rosa-profundo">
                            {product.name.replace(/^Medovik\s+/i, "")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
