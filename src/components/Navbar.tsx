"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BAKERY } from "@/config/bakeryOptions";
import { useOptionalCart } from "@/components/catalog/CartContext";

const NAV_LINKS = [
  { href: "#calidad", label: "¿Por qué Medovik?" },
  { href: "#catalogo", label: "Nuestros Pasteles" },
  { href: "#leyenda", label: "La Leyenda" },
  { href: "#como-pedir", label: "Cómo Pedir" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cart = useOptionalCart();

  const itemCount = cart?.itemCount ?? 0;

  const handleOpenCart = () => {
    if (cart) {
      cart.openCart();
    } else {
      const el = document.getElementById("catalogo");
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Slim Top Utility Bar — Inspired by Reference Image 2 */}
      <div className="bg-rosa-profundo text-crema/95 text-[11px] tracking-wide">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0 text-dorado-suave"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Mérida, Yucatán</span>
            </span>

            <a
              href={`tel:+${BAKERY.whatsappNumber}`}
              className="hidden items-center gap-1.5 font-medium text-crema/90 transition-colors duration-200 hover:text-blanco-calido sm:inline-flex"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="text-dorado-suave"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{BAKERY.whatsapp}</span>
            </a>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={BAKERY.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap text-crema/90 transition-colors duration-200 hover:text-blanco-calido"
              aria-label={`Instagram ${BAKERY.instagramHandle}`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0 text-dorado-suave"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
              <span>{BAKERY.instagramHandle}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Minimalist Navbar — Logo left, 4 clean links center, 1 outlined pill CTA right */}
      <div className="border-b border-dorado-suave/45 bg-blanco-calido/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Brand Emblem + Wordmark */}
          <Link
            href="#inicio"
            className="group flex items-center gap-3 focus:outline-none"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-dorado/60 bg-crema shadow-xs transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105">
              <Image
                src="/assets/logo-emblem.webp"
                alt="Medovik Mérida — Pastelería Rusa Artesanal"
                fill
                sizes="44px"
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-tight text-cacao sm:text-2xl leading-none">
                Medovik Mérida
              </span>
              <span className="mt-0.5 text-[10px] font-semibold tracking-[0.18em] uppercase text-rosa-profundo">
                Pastel Ruso de Miel
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex md:items-center md:gap-7"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-bold uppercase tracking-[0.14em] text-cacao-suave transition-colors duration-200 hover:text-rosa-profundo"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Single Action Button on Right: Icon + title on phone, pill with text on sm+ */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCart}
              title="Tu Pedido"
              aria-label="Tu Pedido"
              className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-rosa-profundo bg-transparent text-xs font-bold uppercase tracking-[0.14em] text-rosa-profundo transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] hover:bg-rosa-profundo hover:text-blanco-calido active:scale-[0.97] sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span className="hidden sm:inline">Tu Pedido</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rosa-profundo px-1.5 text-[11px] font-extrabold text-blanco-calido tabular-nums sm:static">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Abrir menú de navegación"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-dorado-suave/80 text-cacao transition-colors duration-200 hover:bg-crema md:hidden"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 7h16M4 12h16M4 17h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Clean Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-dorado-suave/40 bg-blanco-calido px-4 pt-2 pb-4 md:hidden">
            <nav className="flex flex-col space-y-1" aria-label="Menú móvil">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-cacao transition-colors duration-150 hover:bg-crema hover:text-rosa-profundo"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.95L0 24l6.33-1.66a11.87 11.87 0 0 0 5.73 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.16-3.45-8.42ZM12.07 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.75.98 1-3.66-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 0 1 2.9 7c0 5.45-4.44 9.89-9.9 9.89Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

export default Navbar;
