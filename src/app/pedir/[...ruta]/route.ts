import { NextResponse } from "next/server";
import { BAKERY } from "@/config/bakeryOptions";
import { getActiveStore } from "@/lib/catalog/queries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ruta: string[] }> },
) {
  const { ruta } = await context.params;
  const store = await getActiveStore();
  const phone = (store.whatsapp_number || BAKERY.whatsappNumber).replace(
    /\D/g,
    "",
  );

  const rawText = ruta
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join(" / ")
    .replace(/-/g, " ")
    .trim();

  const text = rawText
    ? `¡Hola, ${store.name}! 🍯 Me interesa pedir: ${rawText} en Mérida.`
    : `¡Hola, ${store.name}! 🍯 Me gustaría hacer un pedido de Pastel Ruso de Miel en Mérida.`;

  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  return NextResponse.redirect(whatsappUrl, 307);
}
