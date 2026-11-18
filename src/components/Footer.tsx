import Image from "next/image";
import Link from "next/link";
import { BAKERY } from "@/config/bakeryOptions";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-dorado/30 bg-cacao text-crema">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {/* Brand Identity */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-dorado/60 bg-blanco-calido">
                <Image
                  src="/assets/logo-emblem.webp"
                  alt="Emblema Medovik Mérida"
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-blanco-calido">
                  Medovik Mérida
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dorado-suave">
                  El Auténtico Pastel Ruso de Miel
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-crema/80 sm:text-sm">
              Ocho a diez finas capas de miel natural de abeja horneadas una por
              una y ensambladas con cremas suaves sin conservadores. Repostería
              artesanal elaborada bajo pedido en Mérida, Yucatán.
            </p>
          </div>

          {/* Navigation */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-dorado-suave">
              Navegación
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-crema/85 sm:text-sm">
              <li>
                <a
                  href="#inicio"
                  className="transition-colors duration-200 hover:text-blanco-calido"
                >
                  Inicio
                </a>
              </li>
              <li>
                <a
                  href="#calidad"
                  className="transition-colors duration-200 hover:text-blanco-calido"
                >
                  ¿Por qué Medovik?
                </a>
              </li>
              <li>
                <a
                  href="#catalogo"
                  className="transition-colors duration-200 hover:text-blanco-calido"
                >
                  Nuestros Pasteles
                </a>
              </li>
              <li>
                <a
                  href="#leyenda"
                  className="transition-colors duration-200 hover:text-blanco-calido"
                >
                  La Leyenda Imperial
                </a>
              </li>
              <li>
                <a
                  href="#como-pedir"
                  className="transition-colors duration-200 hover:text-blanco-calido"
                >
                  Cómo Hacer tu Pedido
                </a>
              </li>
            </ul>
          </div>

          {/* Formats & Contact */}
          <div className="md:col-span-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-dorado-suave">
              Formatos y Contacto
            </h3>
            <ul className="mt-3 space-y-1.5 text-xs text-crema/85">
              <li>
                <strong className="text-blanco-calido">Rebanada (~180 g):</strong>{" "}
                1 porción · Sujeta a disponibilidad
              </li>
              <li>
                <strong className="text-blanco-calido">
                  Pastel Mediano (~1,225 kg):
                </strong>{" "}
                8 a 10 porciones
              </li>
              <li>
                <strong className="text-blanco-calido">
                  Pastel Grande (~2,45 kg):
                </strong>{" "}
                16 a 20 porciones
              </li>
              <li className="pt-2 text-crema/90">
                WhatsApp:{" "}
                <a
                  href={`https://wa.me/${BAKERY.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-dorado-suave underline"
                >
                  {BAKERY.whatsapp}
                </a>
              </li>
              <li className="text-crema/90">
                Instagram:{" "}
                <a
                  href={BAKERY.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-dorado-suave underline"
                >
                  {BAKERY.instagramHandle}
                </a>
              </li>
              <li className="text-crema/75">{BAKERY.address}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-crema/15 pt-6 text-xs text-crema/70 sm:flex-row">
          <p>
            © {currentYear} Medovik Mérida · Repostería Rusa Artesanal en
            Mérida, Yucatán.
          </p>
          <div className="flex items-center gap-4">
            <span>Hecho con ingredientes reales · 0% conservadores</span>
            <Link
              href="/admin"
              className="text-crema/50 transition-colors duration-200 hover:text-crema/90"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
