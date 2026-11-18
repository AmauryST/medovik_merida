"use client";

import { useState } from "react";
import Image from "next/image";
import { BAKERY, MEDOVIK_MENU } from "@/config/bakeryOptions";
import { buildWhatsAppUrl, orderMessage } from "@/lib/whatsapp";
import { useOptionalCart } from "@/components/catalog/CartContext";

type SizeKey = "grande" | "mediano" | "porcion";

const SIZE_TABS: {
  key: SizeKey;
  label: string;
  weight: string;
  servings: string;
  badge: string;
}[] = [
  {
    key: "mediano",
    label: "Pastel Mediano",
    weight: "~1,225 kg",
    servings: "8 a 10 porciones",
    badge: "Mín. 2 días antes",
  },
  {
    key: "grande",
    label: "Pastel Grande",
    weight: "~2,45 kg",
    servings: "16 a 20 porciones",
    badge: "Celebraciones",
  },
  {
    key: "porcion",
    label: "Rebanada Individual",
    weight: "~180 g",
    servings: "1 rebanada generosa",
    badge: "Disponibilidad del día",
  },
];

import type { CatalogProduct } from "@/types/catalog";

interface SignatureLinesSectionProps {
  products?: CatalogProduct[];
  onSelectProduct?: (product: CatalogProduct) => void;
}

export default function SignatureLinesSection(_props: SignatureLinesSectionProps = {}) {
  const [selectedSize, setSelectedSize] = useState<SizeKey>("mediano");
  const cart = useOptionalCart();

  return (
    <section
      id="sabores"
      className="relative overflow-hidden border-y border-dorado-suave/60 bg-crema-oscura/45 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Encabezado */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-rosa-empolvado/55 px-4 py-1 text-xs font-semibold tracking-widest uppercase text-rosa-profundo">
            Comparativa de Formatos · Medovik Mérida
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-cacao sm:text-4xl lg:text-5xl">
            3 Sabores Artesanales ×{" "}
            <span className="italic text-rosa-profundo">3 Formatos</span>
          </h2>
          <p className="mt-3 text-base leading-relaxed text-cacao-suave sm:text-lg">
            Cada uno de nuestros tres pasteles se vende en{" "}
            <strong className="text-cacao">Rebanada (~180 g)</strong>,{" "}
            <strong className="text-cacao">Pastel Mediano (~1,225 kg)</strong> y{" "}
            <strong className="text-cacao">Pastel Grande (~2,45 kg)</strong>.
          </p>
        </div>

        {/* Selector interactivo de tamaño */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {SIZE_TABS.map((tab) => {
            const active = selectedSize === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedSize(tab.key)}
                className={`group relative flex flex-col items-center rounded-2xl border px-5 py-3.5 text-center transition-all cursor-pointer ${
                  active
                    ? "border-rosa-profundo bg-blanco-calido shadow-md ring-2 ring-rosa-profundo/25"
                    : "border-dorado-suave bg-blanco-calido/70 hover:border-dorado hover:bg-blanco-calido"
                }`}
              >
                <span className="rounded-full bg-rosa-empolvado/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rosa-profundo">
                  {tab.badge}
                </span>
                <span className="mt-1 font-serif text-lg font-bold text-cacao sm:text-xl">
                  {tab.label}{" "}
                  <span className="font-sans text-xs font-semibold text-cacao-suave">
                    ({tab.weight})
                  </span>
                </span>
                <span className="text-xs text-cacao-suave">{tab.servings}</span>
              </button>
            );
          })}
        </div>

        {/* Las 3 tarjetas de línea con el formato seleccionado */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {MEDOVIK_MENU.map((line) => {
            const currentOption = line.sizes[selectedSize];
            const slugMap: Record<string, string> = {
              clasico: "medovik-clasico",
              spartak: "medovik-spartak",
              "caramelo-salado": "medovik-caramelo-salado",
            };
            const targetSlug = slugMap[line.slug] ?? line.slug;
            const showLinePrice = cart
              ? cart.isPriceVisibleFor(targetSlug)
              : false;

            const waHref = buildWhatsAppUrl(
              orderMessage(
                `${line.name} — ${currentOption.label}`,
                showLinePrice
                  ? `${currentOption.priceDisplay} (${currentOption.servings})`
                  : currentOption.servings,
              ),
            );

            return (
              <article
                key={line.slug}
                className="flex flex-col overflow-hidden rounded-3xl border border-dorado-suave/80 bg-blanco-calido shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-dorado hover:shadow-xl"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-crema-oscura">
                  <Image
                    src={line.image}
                    alt={`${line.name} — Medovik Mérida`}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 rounded-full bg-blanco-calido/95 px-3 py-1 text-xs font-semibold text-rosa-profundo shadow-xs backdrop-blur-xs">
                    {line.tagline}
                  </div>
                  <div className="absolute right-3 bottom-3 rounded-2xl bg-cacao/90 px-3.5 py-1.5 text-right text-blanco-calido shadow-md backdrop-blur-xs">
                    <span className="block text-[10px] uppercase tracking-wider text-dorado-suave">
                      {currentOption.label}
                    </span>
                    <span className="font-serif text-xl font-bold">
                      {showLinePrice
                        ? currentOption.priceDisplay
                        : currentOption.servings}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-serif text-2xl font-bold text-cacao">
                    {line.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-rosa-profundo">
                    {line.highlight}
                  </p>
                  <p className="mt-2.5 text-sm leading-relaxed text-cacao-suave">
                    {line.description}
                  </p>

                  {/* Tabla de los 3 tamaños */}
                  <div className="mt-5 space-y-1.5 rounded-2xl border border-dorado-suave/60 bg-crema/70 p-3 text-xs">
                    {(["grande", "mediano", "porcion"] as SizeKey[]).map(
                      (sKey) => {
                        const opt = line.sizes[sKey];
                        const isSelected = sKey === selectedSize;
                        return (
                          <button
                            key={sKey}
                            type="button"
                            onClick={() => setSelectedSize(sKey)}
                            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition cursor-pointer ${
                              isSelected
                                ? "bg-rosa-empolvado/55 font-bold text-cacao"
                                : "text-cacao-suave hover:bg-blanco-calido"
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span className="font-bold text-rosa-profundo">
                              {showLinePrice ? opt.priceDisplay : opt.servings}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-2 pt-2">
                    <a
                      href="#catalogo"
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-rosa-profundo px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-blanco-calido shadow-xs transition hover:bg-rosa-intenso"
                    >
                      Conformar en Pedido
                    </a>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-dorado bg-crema px-4 py-2.5 text-xs font-semibold text-cacao transition hover:border-rosa-profundo hover:bg-blanco-calido"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Banner con los 3 formatos y control de precios */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-dorado-suave/80 bg-blanco-calido p-6 shadow-sm sm:p-8">
          <div className="grid items-center gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="inline-block rounded-full bg-rosa-empolvado/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rosa-profundo">
                Resumen de Formatos y Condiciones
              </span>
              <h3 className="mt-2 font-serif text-2xl font-bold text-cacao sm:text-3xl">
                Cada uno de los 3 pasteles disponible en 3 formatos
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-cacao-suave">
                • <strong>Rebanada (~180 g):</strong> ideal para probar;
                consulta disponibilidad del día antes de pedir.
                <br />• <strong>Pastel Mediano (~1,225 kg · 8-10 porciones) y Grande (~2,45 kg · 16-20 porciones):</strong>{" "}
                pídelos con al menos <strong>2 días de anticipación</strong> y
                confirma con el <strong>50% de anticipo</strong>.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-dorado-suave text-cacao-suave">
                      <th className="py-2 pr-3 font-semibold">Pastel</th>
                      <th className="px-3 py-2 font-semibold">
                        Rebanada (~180 g)
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        Mediano (~1,225 kg)
                      </th>
                      <th className="py-2 pl-3 font-semibold">
                        Grande (~2,45 kg)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dorado-suave/50 font-medium text-cacao">
                    <tr>
                      <td className="py-2.5 pr-3 font-serif font-bold">
                        Medovik Clásico
                      </td>
                      <td className="px-3 py-2.5">
                        {cart?.isPriceVisibleFor("medovik-clasico")
                          ? "$100 MXN"
                          : "1 porción"}
                      </td>
                      <td className="px-3 py-2.5">
                        {cart?.isPriceVisibleFor("medovik-clasico")
                          ? "$500 MXN"
                          : "8-10 porciones"}
                      </td>
                      <td className="py-2.5 pl-3">
                        {cart?.isPriceVisibleFor("medovik-clasico")
                          ? "$1,000 MXN"
                          : "16-20 porciones"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-serif font-bold">
                        Medovik Spartak
                      </td>
                      <td className="px-3 py-2.5">
                        {cart?.isPriceVisibleFor("medovik-spartak")
                          ? "$100 MXN"
                          : "1 porción"}
                      </td>
                      <td className="px-3 py-2.5">
                        {cart?.isPriceVisibleFor("medovik-spartak")
                          ? "$600 MXN"
                          : "8-10 porciones"}
                      </td>
                      <td className="py-2.5 pl-3">
                        {cart?.isPriceVisibleFor("medovik-spartak")
                          ? "$1,200 MXN"
                          : "16-20 porciones"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-serif font-bold">
                        Caramelo Salado &amp; Pecana
                      </td>
                      <td className="px-3 py-2.5">
                        {cart?.isPriceVisibleFor("medovik-caramelo-salado")
                          ? "$100 MXN"
                          : "1 porción"}
                      </td>
                      <td className="px-3 py-2.5">
                        {cart?.isPriceVisibleFor("medovik-caramelo-salado")
                          ? "$600 MXN"
                          : "8-10 porciones"}
                      </td>
                      <td className="py-2.5 pl-3">
                        {cart?.isPriceVisibleFor("medovik-caramelo-salado")
                          ? "$1,200 MXN"
                          : "16-20 porciones"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-cacao-suave">
                Pedidos en {BAKERY.address} · WhatsApp{" "}
                <strong className="text-cacao">{BAKERY.phone}</strong> ·
                Instagram{" "}
                <strong className="text-rosa-profundo">
                  {BAKERY.instagramHandle}
                </strong>
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-dorado-suave">
                <Image
                  src="/assets/triptico-sabores.webp"
                  alt="Las 3 líneas de Medovik Mérida: Clásico, Spartak y Caramelo Salado"
                  fill
                  sizes="(max-width: 1024px) 100vw, 440px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
