import Image from "next/image";
import Link from "next/link";
import { BAKERY } from "@/config/bakeryOptions";
import { buildWhatsAppUrl, generalInquiryMessage } from "@/lib/whatsapp";

interface FooterProps {
  whatsappPhone?: string;
}

export default function Footer({ whatsappPhone }: FooterProps = {}) {
  const year = new Date().getFullYear();
  const whatsappHref = buildWhatsAppUrl(generalInquiryMessage(), whatsappPhone);

  return (
    <footer className="border-t border-dorado-suave/60 bg-cacao text-crema">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Identidad */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <span className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-dorado bg-blanco-calido">
                <Image
                  src="/assets/logo-emblem.webp"
                  alt="Logo Medovik Mérida"
                  width={96}
                  height={96}
                  sizes="48px"
                  className="h-full w-full object-cover"
                />
              </span>
              <div>
                <p className="font-serif text-2xl font-bold text-blanco-calido">
                  {BAKERY.name}
                </p>
                <p className="text-xs tracking-widest uppercase text-dorado-suave">
                  {BAKERY.tagline}
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-crema/80">
              Repostería artesanal especializada en Pastel Ruso de Miel (Medovik) en Mérida, Yucatán. Finas capas horneadas una por una con miel natural, mantequilla de verdad y cremas suaves.
            </p>
            <p className="mt-3 text-xs text-dorado-suave/90">
              Sabores: Clásico · Spartak (Miel, Cacao, Ciruela & Nuez) · Caramelo Salado & Nuez Pecana.
            </p>
          </div>

          {/* Enlaces */}
          <div className="md:col-span-3">
            <h3 className="font-serif text-base font-semibold tracking-wider uppercase text-dorado-suave">
              Explorar
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-crema/80">
              <li>
                <a href="#inicio" className="hover:text-blanco-calido">
                  Inicio
                </a>
              </li>
              <li>
                <a href="#catalogo" className="hover:text-blanco-calido">
                  Catálogo y Tamaños
                </a>
              </li>
              <li>
                <a href="#sabores" className="hover:text-blanco-calido">
                  3 Sabores y Menú MXN
                </a>
              </li>
              <li>
                <a href="#leyenda" className="hover:text-blanco-calido">
                  La Dulce Leyenda del Medovik
                </a>
              </li>
              <li>
                <a href="#calidad" className="hover:text-blanco-calido">
                  Nuestros 3 Pilares de Calidad
                </a>
              </li>
              <li>
                <Link href="/pedido" className="hover:text-blanco-calido">
                  Rastrear mi pedido
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div className="md:col-span-4">
            <h3 className="font-serif text-base font-semibold tracking-wider uppercase text-dorado-suave">
              Contacto en Mérida
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-crema/80">
              <li>
                <span className="text-crema/60">Ciudad:</span> {BAKERY.city}
              </li>
              <li>
                <span className="text-crema/60">Pedidos WhatsApp:</span>{" "}
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-dorado-suave hover:underline"
                >
                  +52 {BAKERY.phone}
                </a>
              </li>
              <li>
                <span className="text-crema/60">Instagram:</span>{" "}
                <a
                  href={BAKERY.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-dorado-suave hover:underline"
                >
                  {BAKERY.instagramHandle}
                </a>
              </li>
              <li>
                <span className="text-crema/60">Modalidad:</span> Pasteles frescos por pedido · Moneda MXN ($)
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-crema/15 pt-6 text-xs text-crema/60 sm:flex-row">
          <p>
            © {year} {BAKERY.name}. Todos los derechos reservados · Mérida, Yucatán, México.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacidad" className="hover:text-blanco-calido transition-colors">
              Política de Privacidad
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/terminos" className="hover:text-blanco-calido transition-colors">
              Términos y Condiciones
            </Link>
            <span aria-hidden="true">·</span>
            <p>Hecho con miel natural y dedicación artesanal 🍯</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
