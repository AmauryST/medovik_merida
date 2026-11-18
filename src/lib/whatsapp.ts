import { BAKERY } from "@/config/bakeryOptions";

/** Builds a `https://wa.me/<num>?text=<encoded>` link. */
export function buildWhatsAppUrl(
  message: string,
  phone: string = BAKERY.whatsappNumber,
): string {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/** Quick message to ask about a specific Medovik cake. */
export function productInquiryMessage(productName: string): string {
  return `¡Hola, ${BAKERY.name}! 🍯 Vi en el catálogo "${productName}" y me gustaría consultar disponibilidad para un pedido en Mérida.`;
}

/** Order message for a specific product and format/size. */
export function orderMessage(productTitle: string, formatDetail: string): string {
  return `¡Hola, ${BAKERY.name}! 🍯 Me gustaría pedir "${productTitle}" (${formatDetail}) en Mérida. ¿Me apoyan con disponibilidad y detalles del 50% de anticipo?`;
}

/** General message for the hero / navbar / floating buttons. */
export function generalInquiryMessage(): string {
  return `¡Hola, ${BAKERY.name}! 🍯 Me gustaría hacer un pedido de Pastel Ruso de Miel (Medovik) en Mérida.`;
}
