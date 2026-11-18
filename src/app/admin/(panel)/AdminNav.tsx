"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/admin/catalogo/", label: "Catálogo" },
  { href: "/admin/medios/", label: "Medios" },
  { href: "/admin/zonas/", label: "Zonas" },
  { href: "/admin/pedidos/", label: "Pedidos" },
] as const;

/** Bottom tab bar: within thumb reach on phones, centred on wider screens. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {SECTIONS.map((section) => {
          const active = pathname.startsWith(section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 items-center justify-center text-[13px] font-medium transition-colors ${
                  active ? "text-(--brand)" : "text-stone-500"
                }`}
              >
                {active ? (
                  <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-(--brand)" />
                ) : null}
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
