"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { BAKERY } from "@/config/bakeryOptions";
import { useOptionalCart } from "@/components/catalog/CartContext";
import { buildWhatsAppUrl, generalInquiryMessage } from "@/lib/whatsapp";

const NAV_LINKS = [
  { href: "#catalogo", label: "Catálogo" },
  { href: "#sabores", label: "3 Sabores y Precios" },
  { href: "#como-pedir", label: "Cómo Pedir" },
  { href: "#leyenda", label: "La Leyenda" },
  { href: "#calidad", label: "Nuestra Calidad" },
  { href: "#contacto", label: "Contacto" },
];

interface NavbarProps {
  whatsappPhone?: string;
}

export default function Navbar({ whatsappPhone }: NavbarProps = {}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cart = useOptionalCart();
  const totalCount = cart?.itemCount ?? 0;
  const openCart = () => cart?.openCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const whatsappHref = buildWhatsAppUrl(generalInquiryMessage(), whatsappPhone);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-crema/95 backdrop-blur-md shadow-sm border-b border-dorado-suave/40"
          : "bg-crema/85 backdrop-blur-sm"
      }`}
    >
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
      >
        {/* Marca */}
        <a
          href="#inicio"
          className="group flex items-center gap-3 focus:outline-none"
        >
          <span className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-dorado/60 bg-blanco-calido shadow-sm transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/assets/logo-emblem.webp"
              alt="Logo Medovik Mérida — Pastel Ruso de Miel"
              width={96}
              height={96}
              sizes="48px"
              priority
              className="h-full w-full object-cover"
            />
          </span>
          <div className="leading-tight">
            <span className="block font-serif text-xl font-bold tracking-tight text-cacao sm:text-2xl">
              {BAKERY.name}
            </span>
            <span className="block text-[11px] font-medium tracking-widest uppercase text-rosa-profundo">
              Pastel Ruso de Miel · Mérida
            </span>
          </div>
        </a>

        {/* Links desktop */}
        <ul className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-cacao-suave transition-colors hover:text-rosa-profundo"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Acciones: Instagram + Carrito + CTA WhatsApp desktop */}
        <div className="hidden items-center gap-2.5 md:flex">
          <a
            href={BAKERY.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Síguenos en Instagram ${BAKERY.instagramHandle}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-dorado/35 bg-blanco-calido px-3.5 py-2 text-xs font-semibold text-cacao transition-all hover:border-dorado hover:bg-crema-oscura"
          >
            <svg className="h-4 w-4 text-rosa-profundo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            <span className="hidden xl:inline">{BAKERY.instagramHandle}</span>
          </a>

          <button
            type="button"
            onClick={openCart}
            aria-label="Abrir tu pedido"
            className="relative inline-flex items-center gap-2 rounded-full border border-dorado/40 bg-blanco-calido px-4 py-2.5 text-sm font-semibold text-cacao shadow-xs transition-all hover:border-rosa-profundo/50 hover:bg-crema-oscura cursor-pointer"
          >
            <svg className="h-4 w-4 text-rosa-profundo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>Pedido</span>
            {totalCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rosa-profundo px-1.5 text-[11px] font-bold text-blanco-calido">
                {totalCount}
              </span>
            )}
          </button>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-rosa-profundo px-5 py-2.5 text-sm font-semibold text-blanco-calido shadow-sm transition-all duration-200 hover:bg-rosa-intenso hover:shadow-md"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span>Pedir · {BAKERY.phone}</span>
          </a>
        </div>

        {/* Botón carrito + menú móvil */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={openCart}
            aria-label="Abrir tu pedido"
            className="relative inline-flex h-10 items-center gap-1.5 rounded-full border border-dorado-suave bg-blanco-calido px-3 text-xs font-bold text-cacao cursor-pointer"
          >
            <svg className="h-4 w-4 text-rosa-profundo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {totalCount > 0 && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rosa-profundo px-1 text-[10px] font-bold text-blanco-calido">
                {totalCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-dorado-suave text-cacao transition-colors hover:bg-rosa-empolvado/40"
          >
            {open ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Panel móvil */}
      {open && (
        <div className="border-t border-dorado-suave/50 bg-blanco-calido px-6 py-5 shadow-lg md:hidden">
          <ul className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-2 text-base font-medium text-cacao hover:bg-crema-oscura hover:text-rosa-profundo"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2.5">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-rosa-profundo px-5 py-3 text-sm font-semibold text-blanco-calido shadow-sm hover:bg-rosa-intenso"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span>Pedir por WhatsApp · {BAKERY.phone}</span>
            </a>
            <a
              href={BAKERY.instagram}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-dorado/40 bg-crema px-5 py-2.5 text-xs font-semibold text-cacao"
            >
              <span>Síguenos en Instagram {BAKERY.instagramHandle}</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.95L0 24l6.32-1.66a11.87 11.87 0 0 0 5.73 1.46h.01c6.55 0 11.89-5.34 11.9-11.9a11.82 11.82 0 0 0-3.44-8.42ZM12.05 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.24-.38a9.88 9.88 0 0 1-1.52-5.26c0-5.46 4.44-9.9 9.92-9.9 2.65 0 5.14 1.03 7.01 2.9a9.85 9.85 0 0 1 2.9 7c0 5.46-4.45 9.9-9.91 9.9Zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}
