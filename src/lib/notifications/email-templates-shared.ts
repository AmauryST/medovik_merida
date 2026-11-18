import type {
  EmailTemplateItem,
  NotifiableOrderStatus,
  OrderTrackingMeta,
  StoreEmailTemplates,
} from "@/types/admin";

export const NOTIFIABLE_STATUSES: ReadonlyArray<{
  status: NotifiableOrderStatus;
  label: string;
  description: string;
}> = [
  {
    status: "AWAITING_PAYMENT",
    label: "Pedido registrado / Esperando pago",
    description: "Se envía al crear el pedido en línea con el enlace de pago y el link de seguimiento.",
  },
  {
    status: "PAID",
    label: "Pago confirmado",
    description: "Se envía automáticamente cuando se confirma el pago (o al marcarlo como Pagado).",
  },
  {
    status: "PREPARING",
    label: "En preparación",
    description: "Se envía cuando el pastel entra en elaboración en el obrador.",
  },
  {
    status: "OUT_FOR_DELIVERY",
    label: "En camino en La Habana",
    description: "Se envía cuando el pedido sale a reparto hacia la dirección del destinatario.",
  },
  {
    status: "DELIVERED",
    label: "Pedido entregado",
    description: "Se envía al confirmar que el pastel fue entregado en manos del destinatario.",
  },
  {
    status: "CANCELLED",
    label: "Pedido cancelado",
    description: "Se envía si el pedido es cancelado.",
  },
];

export const EMAIL_TEMPLATE_VARIABLES: ReadonlyArray<{
  token: string;
  description: string;
  sample: string;
}> = [
  { token: "{{buyer_name}}", description: "Nombre de quien envía", sample: "Ana Pérez" },
  { token: "{{order_code}}", description: "Código del pedido", sample: "#DEL-1004" },
  { token: "{{store_name}}", description: "Nombre de la tienda", sample: "Donde Delia" },
  { token: "{{total_usd}}", description: "Total en USD", sample: "$35.00 USD" },
  { token: "{{items_summary}}", description: "Resumen de pasteles", sample: "Pastel Red Velvet (Mediano) × 1" },
  { token: "{{recipient_name}}", description: "Nombre de quien recibe en Cuba", sample: "Mamá Carmen" },
  { token: "{{delivery_address}}", description: "Dirección de entrega en La Habana", sample: "Calle 23 #456, Vedado" },
  { token: "{{delivery_date}}", description: "Fecha de entrega", sample: "2026-11-15" },
  { token: "{{delivery_slot}}", description: "Horario de entrega", sample: "Tarde (1:00 PM - 6:00 PM)" },
  { token: "{{tracking_url}}", description: "Enlace de seguimiento en vivo", sample: "https://dulce-delia.vercel.app/pedido/DEL-1004" },
  { token: "{{payment_url}}", description: "Enlace de pago", sample: "https://tppay.me/ejemplo" },
];

export const DEFAULT_EMAIL_TEMPLATES: StoreEmailTemplates = {
  AWAITING_PAYMENT: {
    enabled: true,
    subject: "Tu pedido {{order_code}} en {{store_name}} · Enlace de pago y seguimiento",
    heading: "¡Hola {{buyer_name}}! Recibimos tu pedido {{order_code}}",
    body: "Hemos reservado los datos de entrega para {{recipient_name}} en La Habana ({{delivery_date}}).\n\nSi aún no has completado el pago con tarjeta, puedes hacerlo desde el botón de abajo. En todo momento puedes consultar el estado actualizado de tu pago y entrega en tu página de seguimiento.",
    ctaLabel: "Completar pago / Ver estado del pedido",
  },
  PAID: {
    enabled: true,
    subject: "✅ Pago confirmado · Pedido {{order_code}} en {{store_name}}",
    heading: "¡Pago confirmado para tu pedido {{order_code}}!",
    body: "Hola {{buyer_name}}, hemos recibido correctamente tu pago de {{total_usd}}.\n\nTu pastel ({{items_summary}}) quedó agendado para entregarse a {{recipient_name}} el {{delivery_date}} ({{delivery_slot}}) en {{delivery_address}}.\n\nPuedes seguir cada etapa de preparación y entrega desde tu enlace de seguimiento.",
    ctaLabel: "Seguir mi pedido en vivo",
  },
  PREPARING: {
    enabled: true,
    subject: "🎂 Estamos preparando tu pastel · Pedido {{order_code}}",
    heading: "Tu pastel del pedido {{order_code}} está en preparación",
    body: "Hola {{buyer_name}}, nuestro obrador ya está elaborando y decorando artesanalmente tu pedido ({{items_summary}}) para {{recipient_name}}.\n\nTe avisaremos por este medio en cuanto salga en camino hacia {{delivery_address}}.",
    ctaLabel: "Ver estado de mi pedido",
  },
  OUT_FOR_DELIVERY: {
    enabled: true,
    subject: "🚗 Tu pastel va en camino en La Habana · Pedido {{order_code}}",
    heading: "¡Tu pedido {{order_code}} ya va en camino!",
    body: "Hola {{buyer_name}}, tu pastel ya salió hacia {{delivery_address}} para entregarse a {{recipient_name}}.\n\nTe confirmaremos apenas sea entregado.",
    ctaLabel: "Ver seguimiento en vivo",
  },
  DELIVERED: {
    enabled: true,
    subject: "🎉 ¡Pedido {{order_code}} entregado en La Habana! · {{store_name}}",
    heading: "¡Tu pastel fue entregado con éxito!",
    body: "Hola {{buyer_name}}, te confirmamos que el pedido {{order_code}} ({{items_summary}}) ha sido entregado a {{recipient_name}} en La Habana.\n\n¡Muchas gracias por confiar en {{store_name}} para endulzar sus momentos especiales!",
    ctaLabel: "Ver comprobante del pedido",
  },
  CANCELLED: {
    enabled: false,
    subject: "Actualización sobre tu pedido {{order_code}} · {{store_name}}",
    heading: "El pedido {{order_code}} ha sido cancelado",
    body: "Hola {{buyer_name}}, tu pedido {{order_code}} figura como cancelado. Si tienes cualquier duda o deseas reprogramarlo, contáctanos directamente por WhatsApp.",
    ctaLabel: "Consultar detalles del pedido",
  },
};

export function mergeEmailTemplates(raw: unknown): StoreEmailTemplates {
  const result: StoreEmailTemplates = {
    AWAITING_PAYMENT: { ...DEFAULT_EMAIL_TEMPLATES.AWAITING_PAYMENT },
    PAID: { ...DEFAULT_EMAIL_TEMPLATES.PAID },
    PREPARING: { ...DEFAULT_EMAIL_TEMPLATES.PREPARING },
    OUT_FOR_DELIVERY: { ...DEFAULT_EMAIL_TEMPLATES.OUT_FOR_DELIVERY },
    DELIVERED: { ...DEFAULT_EMAIL_TEMPLATES.DELIVERED },
    CANCELLED: { ...DEFAULT_EMAIL_TEMPLATES.CANCELLED },
  };

  if (!raw || typeof raw !== "object") return result;

  for (const { status } of NOTIFIABLE_STATUSES) {
    const candidate = (raw as Record<string, unknown>)[status];
    if (candidate && typeof candidate === "object") {
      const item = candidate as Partial<EmailTemplateItem>;
      result[status] = {
        enabled: typeof item.enabled === "boolean" ? item.enabled : result[status].enabled,
        subject: typeof item.subject === "string" && item.subject.trim() ? item.subject : result[status].subject,
        heading: typeof item.heading === "string" && item.heading.trim() ? item.heading : result[status].heading,
        body: typeof item.body === "string" && item.body.trim() ? item.body : result[status].body,
        ctaLabel: typeof item.ctaLabel === "string" && item.ctaLabel.trim() ? item.ctaLabel : result[status].ctaLabel,
      };
    }
  }
  return result;
}

export function interpolateEmailTemplate(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] ?? `{{${key}}}`;
  });
}

export function parseOrderTrackingMeta(raw: unknown): OrderTrackingMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  // If raw was a legacy raw TropiPay webhook object (without timeline/email_logs/fee_breakdown), preserve it under tropipay_webhook
  if ("data" in obj || "status" in obj || "reference" in obj) {
    if (
      !("timeline" in obj) &&
      !("email_logs" in obj) &&
      !("crm_notes" in obj) &&
      !("fee_breakdown" in obj)
    ) {
      return {
        tropipay_webhook: obj,
      };
    }
  }
  return {
    tracking_token: typeof obj.tracking_token === "string" ? obj.tracking_token : undefined,
    timeline: Array.isArray(obj.timeline) ? (obj.timeline as OrderTrackingMeta["timeline"]) : [],
    email_logs: Array.isArray(obj.email_logs) ? (obj.email_logs as OrderTrackingMeta["email_logs"]) : [],
    crm_sync:
      obj.crm_sync && typeof obj.crm_sync === "object"
        ? (obj.crm_sync as OrderTrackingMeta["crm_sync"])
        : null,
    crm_notes: typeof obj.crm_notes === "string" ? obj.crm_notes : "",
    customer_tags: Array.isArray(obj.customer_tags) ? (obj.customer_tags as string[]) : [],
    tropipay_webhook: obj.tropipay_webhook ?? null,
    fee_breakdown:
      obj.fee_breakdown && typeof obj.fee_breakdown === "object"
        ? (obj.fee_breakdown as OrderTrackingMeta["fee_breakdown"])
        : null,
  };
}
