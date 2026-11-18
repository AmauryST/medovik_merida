import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { BRAND } from "@/config/brand";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#FBF7EF",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: `${BRAND.storeName} | Pastel Ruso de Miel Artesanal en Mérida, Yucatán`,
  description:
    "Pasteles rusos de miel (Medovik) hechos a mano en Mérida, Yucatán. Sabores Clásico, Spartak (Miel, Cacao, Ciruela y Nuez) y Caramelo Salado con Nuez Pecana. Presentaciones Grande (~2.45 kg), Mediano (~1.225 kg) y Porción (~180 g). Pedidos por WhatsApp al 999 903 0512.",
  keywords: [
    "Medovik Mérida",
    "pastel ruso de miel Mérida",
    "Medovik México",
    "pastelería artesanal Mérida Yucatán",
    "pastel Spartak cacao miel",
    "pastel de miel caramelo salado nuez pecana",
    "pasteles por pedido Mérida",
    "repostería rusa en Mérida",
  ],
  authors: [{ name: BRAND.storeName }],
  openGraph: {
    title: `${BRAND.storeName} — Pastel Ruso de Miel en Mérida, Yucatán`,
    description:
      "Finas capas de miel natural horneadas y ensambladas una por una con cremas suaves y equilibradas. Descubre nuestros sabores Clásico, Spartak y Caramelo Salado.",
    type: "website",
    locale: "es_MX",
    siteName: BRAND.storeName,
    images: [
      {
        url: "/assets/hero.webp",
        width: 1000,
        height: 1000,
        alt: `${BRAND.storeName} — Pastel Ruso de Miel con Higos Frescos`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.storeName} — Pastel Ruso de Miel en Mérida`,
    description:
      "Pasteles artesanales frescos por pedido en Mérida, Yucatán. Clásico, Spartak y Caramelo Salado.",
    images: ["/assets/hero.webp"],
  },
  icons: {
    icon: "/assets/logo-emblem.webp",
    apple: "/assets/logo-emblem.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-MX"
      className={`${playfair.variable} ${cormorant.variable} ${jakarta.variable}`}
    >
      <body className="min-h-screen flex flex-col antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
