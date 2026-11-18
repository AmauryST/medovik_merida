"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  generateOrderTropiPayLinkAction,
  saveOrderCrmDetailsAction,
  saveStoreEmailTemplatesAction,
  saveStoreIntegrationsAction,
  saveStoreTropiPayCredentialsAction,
  sendOrderEmailManualAction,
  syncOrderCrmManualAction,
  testStoreTropiPayConnectionAction,
  updateOrderFeesAndQuoteAction,
  updateOrderStatusAction,
  updateStorePaymentSettingsAction,
} from "@/lib/admin/order-actions";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_VARIABLES,
  interpolateEmailTemplate,
  NOTIFIABLE_STATUSES,
  parseOrderTrackingMeta,
} from "@/lib/notifications/email-templates-shared";
import type { TropiPayEnv } from "@/lib/payments/tropipay";
import { createClient } from "@/lib/supabase/client";
import {
  ORDER_STATUS_LABELS,
  type AdminOrderRow,
  type CrmProviderType,
  type NotifiableOrderStatus,
  type StoreEmailTemplates,
  type StoreMemberRole,
} from "@/types/admin";
import type {
  BusinessPreset,
  OrderExtraFeeLine,
  OrderStatus,
  OrderMode,
  PaymentMethod,
  PaymentProvider,
  ShippingFeeMode,
  StoreCheckoutConfig,
  Uuid,
} from "@/types/catalog";
import { formatCents } from "@/types/catalog";

type LiveState = "connecting" | "live" | "offline";
type AdminTab = "orders" | "crm" | "templates";
type OrderFilter = "ALL" | "PAID" | "UNPAID" | "ACTIVE" | "DELIVERED";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: "bg-amber-100 text-amber-900",
  AWAITING_PAYMENT: "bg-orange-100 text-orange-900",
  PAID: "bg-emerald-100 text-emerald-900",
  PREPARING: "bg-sky-100 text-sky-900",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-900",
  DELIVERED: "bg-stone-200 text-stone-700",
  CANCELLED: "bg-stone-100 text-stone-500 line-through",
};

const ALL_STATUSES: ReadonlyArray<OrderStatus> = [
  "PENDING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "PAID",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const dateFormat = new Intl.DateTimeFormat("es", {
  timeZone: "America/Havana",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function isOrderRow(value: unknown): value is AdminOrderRow {
  const row = value as Partial<AdminOrderRow> | null;
  return Boolean(row && typeof row.id === "string" && typeof row.order_code === "string");
}

function sortNewestFirst(rows: AdminOrderRow[]): AdminOrderRow[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function isOrderPaid(order: AdminOrderRow): boolean {
  return (
    Boolean(order.paid_at) ||
    order.status === "PAID" ||
    order.status === "PREPARING" ||
    order.status === "OUT_FOR_DELIVERY" ||
    order.status === "DELIVERED"
  );
}

function parseUsdToCents(raw: string): number {
  const normalized = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100);
}

function centsToUsdInput(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}

interface OrderQuoteDraft {
  deliveryUsd: string;
  zoneName: string;
  extraFees: Array<{ id: string; label: string; amountUsd: string }>;
  discountUsd: string;
  discountLabel: string;
  quoteNote: string;
}

function buildInitialQuoteDraft(order: AdminOrderRow): OrderQuoteDraft {
  const meta = parseOrderTrackingMeta(order.webhook_payload);
  const breakdown = meta.fee_breakdown;
  return {
    deliveryUsd: centsToUsdInput(order.delivery_fee_cents ?? 0),
    zoneName: order.delivery_zone_name ?? "",
    extraFees: (breakdown?.extra_fees ?? []).map((f) => ({
      id: f.id,
      label: f.label,
      amountUsd: centsToUsdInput(f.amount_cents),
    })),
    discountUsd: centsToUsdInput(breakdown?.discount_cents ?? 0),
    discountLabel: breakdown?.discount_label ?? "",
    quoteNote: breakdown?.admin_quote_note ?? "",
  };
}

function buildBuyerWhatsAppHref(order: AdminOrderRow, storeName: string): string | null {
  const digits = (order.buyer_phone ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;

  const meta = parseOrderTrackingMeta(order.webhook_payload);
  const breakdown = meta.fee_breakdown;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const lines = [
    `Hola ${order.buyer_name ?? ""}, te escribimos de *${storeName}* sobre tu pedido *#${order.order_code}*.`,
    `• Subtotal productos: $${formatCents(order.subtotal_cents ?? 0)} ${order.currency}`,
  ];

  if ((order.delivery_fee_cents ?? 0) > 0 || breakdown?.shipping_quoted) {
    lines.push(
      `• Envío${order.delivery_zone_name ? ` (${order.delivery_zone_name})` : ""}: $${formatCents(order.delivery_fee_cents ?? 0)} ${order.currency}`,
    );
  } else {
    lines.push("• Envío: Por confirmar");
  }

  for (const fee of breakdown?.extra_fees ?? []) {
    lines.push(`• ${fee.label}: $${formatCents(fee.amount_cents)} ${order.currency}`);
  }
  if ((breakdown?.discount_cents ?? 0) > 0) {
    lines.push(
      `• Descuento${breakdown?.discount_label ? ` (${breakdown.discount_label})` : ""}: -$${formatCents(breakdown?.discount_cents ?? 0)} ${order.currency}`,
    );
  }

  lines.push(`*Total final: $${formatCents(order.total_cents)} ${order.currency}*`);
  if (breakdown?.admin_quote_note) {
    lines.push(`Nota: ${breakdown.admin_quote_note}`);
  }
  lines.push(`Estado actual: *${ORDER_STATUS_LABELS[order.status] ?? order.status}*.`);
  if (order.payment_link_url && !isOrderPaid(order)) {
    lines.push(`Enlace seguro de pago: ${order.payment_link_url}`);
  }
  const trackingToken = order.tracking_token ?? meta.tracking_token;
  if (trackingToken) {
    lines.push(`Seguimiento en vivo: ${origin}/pedido/${encodeURIComponent(trackingToken)}`);
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export interface StorePaymentSettingsProps {
  saveOrders: boolean;
  paymentProvider: PaymentProvider;
  paymentMethods: PaymentMethod[];
  orderPrefix: string;
  currency?: string;
  tropiPayConfigured: boolean;
  tropiPaySource: "database" | "env" | null;
  tropiPayEnv: TropiPayEnv;
  tropiPayClientIdHint: string | null;
}

export interface StoreIntegrationsSummaryProps {
  resendConfigured: boolean;
  resendSource: "database" | "env" | "none";
  resendFromEmail: string;
  crmProvider: CrmProviderType;
  crmConfigured: boolean;
  crmWebhookUrlMasked: string | null;
}

interface CrmContactSummary {
  key: string;
  name: string;
  email: string | null;
  phone: string;
  ordersCount: number;
  paidOrdersCount: number;
  totalSpentCents: number;
  lastOrderCode: string;
  lastOrderStatus: OrderStatus;
  lastOrderDate: string;
  recipients: string[];
  notes: string[];
}

export function OrdersLive({
  storeId,
  storeName,
  role,
  initialOrders,
  limit,
  loadError,
  savesOrders,
  initialEmailTemplates,
  integrationsSummary,
  initialCheckoutConfig,
  paymentSettings,
}: {
  storeId: Uuid;
  storeName: string;
  role: StoreMemberRole;
  initialOrders: AdminOrderRow[];
  limit: number;
  loadError: string | null;
  savesOrders: boolean;
  initialEmailTemplates: StoreEmailTemplates;
  integrationsSummary: StoreIntegrationsSummaryProps;
  initialCheckoutConfig: StoreCheckoutConfig;
  paymentSettings: StorePaymentSettingsProps;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>("orders");
  const [orders, setOrders] = useState(initialOrders);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [live, setLive] = useState<LiveState>("connecting");
  const [freshIds, setFreshIds] = useState<Set<Uuid>>(new Set());
  const [expandedId, setExpandedId] = useState<Uuid | null>(
    initialOrders[0]?.id ?? null,
  );
  const [actionMessage, setActionMessage] = useState<{
    orderId: Uuid;
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Per-order CRM, manual email & fee quote drafts
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, OrderQuoteDraft>>({});
  const [manualTemplateStatus, setManualTemplateStatus] = useState<
    Record<string, NotifiableOrderStatus>
  >({});

  // Customizable Email Templates state
  const [templates, setTemplates] = useState<StoreEmailTemplates>(initialEmailTemplates);
  const [selectedTemplateStatus, setSelectedTemplateStatus] =
    useState<NotifiableOrderStatus>("AWAITING_PAYMENT");
  const [templateFeedback, setTemplateFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  // Integrations (Resend + External CRM) state
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState(
    integrationsSummary.resendFromEmail,
  );
  const [crmProvider, setCrmProvider] = useState<CrmProviderType>(
    integrationsSummary.crmProvider,
  );
  const [crmApiKey, setCrmApiKey] = useState("");
  const [crmWebhookUrl, setCrmWebhookUrl] = useState("");

  // Owner payment & checkout config settings state
  const [saveOrdersToggle, setSaveOrdersToggle] = useState(paymentSettings.saveOrders);
  const [provider, setProvider] = useState<PaymentProvider>(
    paymentSettings.paymentProvider,
  );
  const [methods, setMethods] = useState<PaymentMethod[]>(
    paymentSettings.paymentMethods,
  );
  const [orderPrefix, setOrderPrefix] = useState(paymentSettings.orderPrefix);
  const [storeCurrency, setStoreCurrency] = useState(paymentSettings.currency ?? "USD");
  const [checkoutConfig, setCheckoutConfig] = useState<StoreCheckoutConfig>(
    initialCheckoutConfig,
  );
  const [fixedShippingUsd, setFixedShippingUsd] = useState(() =>
    centsToUsdInput(initialCheckoutConfig.fixed_shipping_fee_cents),
  );
  const [extraFeeRulesDraft, setExtraFeeRulesDraft] = useState(() =>
    initialCheckoutConfig.default_extra_fees.map((rule) => ({
      id: rule.id,
      label: rule.label,
      amountUsd: centsToUsdInput(rule.amount_cents),
      enabled: rule.enabled,
    })),
  );
  const [tropiClientId, setTropiClientId] = useState("");
  const [tropiClientSecret, setTropiClientSecret] = useState("");
  const [tropiEnv, setTropiEnv] = useState<TropiPayEnv>(paymentSettings.tropiPayEnv);
  const [settingsFeedback, setSettingsFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-orders-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: Uuid }).id;
            setOrders((current) => current.filter((order) => order.id !== id));
            return;
          }
          if (!isOrderRow(payload.new)) return;
          const row = payload.new;
          setOrders((current) => {
            const existing = current.find((order) => order.id === row.id);
            const mergedRow: AdminOrderRow = {
              ...row,
              tracking_token:
                row.tracking_token ??
                parseOrderTrackingMeta(row.webhook_payload).tracking_token ??
                existing?.tracking_token,
            };
            return sortNewestFirst([
              mergedRow,
              ...current.filter((order) => order.id !== row.id),
            ]).slice(0, limit);
          });
          if (payload.eventType === "INSERT") {
            setFreshIds((current) => new Set(current).add(row.id));
          }
        },
      )
      .subscribe((status) => {
        setLive(
          status === "SUBSCRIBED"
            ? "live"
            : status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT"
              ? "offline"
              : "connecting",
        );
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [storeId, limit]);

  // Compute KPI metrics
  const kpis = useMemo(() => {
    let paidCount = 0;
    let paidCents = 0;
    let unpaidCount = 0;
    let unpaidCents = 0;
    let activeDeliveryCount = 0;

    for (const o of orders) {
      if (o.status === "CANCELLED") continue;
      if (isOrderPaid(o)) {
        paidCount += 1;
        paidCents += o.total_cents;
      } else {
        unpaidCount += 1;
        unpaidCents += o.total_cents;
      }
      if (o.status === "PREPARING" || o.status === "OUT_FOR_DELIVERY") {
        activeDeliveryCount += 1;
      }
    }

    return {
      totalCount: orders.length,
      paidCount,
      paidCents,
      unpaidCount,
      unpaidCents,
      activeDeliveryCount,
    };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderFilter === "PAID" && !isOrderPaid(o)) return false;
      if (
        orderFilter === "UNPAID" &&
        (isOrderPaid(o) || o.status === "CANCELLED")
      ) {
        return false;
      }
      if (
        orderFilter === "ACTIVE" &&
        o.status !== "PAID" &&
        o.status !== "PREPARING" &&
        o.status !== "OUT_FOR_DELIVERY"
      ) {
        return false;
      }
      if (orderFilter === "DELIVERED" && o.status !== "DELIVERED") return false;

      if (!q) return true;
      const haystack = [
        o.order_code,
        o.buyer_name,
        o.buyer_phone,
        o.buyer_email,
        o.recipient_name,
        o.recipient_phone,
        o.delivery_address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [orders, orderFilter, searchQuery]);

  // Built-in CRM Contacts aggregated from orders
  const crmContacts = useMemo<CrmContactSummary[]>(() => {
    const map = new Map<string, CrmContactSummary>();

    for (const o of orders) {
      const emailClean = o.buyer_email?.trim().toLowerCase() || null;
      const phoneClean = (o.buyer_phone ?? "").replace(/\D/g, "");
      const key = emailClean || phoneClean || (o.buyer_name ?? "").trim().toLowerCase() || o.id;
      const meta = parseOrderTrackingMeta(o.webhook_payload);

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          name: o.buyer_name || "Cliente",
          email: emailClean,
          phone: o.buyer_phone || "—",
          ordersCount: 1,
          paidOrdersCount: isOrderPaid(o) ? 1 : 0,
          totalSpentCents: o.status !== "CANCELLED" ? o.total_cents : 0,
          lastOrderCode: o.order_code,
          lastOrderStatus: o.status,
          lastOrderDate: o.created_at,
          recipients: o.recipient_name ? [o.recipient_name] : [],
          notes: meta.crm_notes ? [meta.crm_notes] : [],
        });
      } else {
        existing.ordersCount += 1;
        if (isOrderPaid(o)) existing.paidOrdersCount += 1;
        if (o.status !== "CANCELLED") existing.totalSpentCents += o.total_cents;
        if (!existing.email && emailClean) existing.email = emailClean;
        if (
          o.recipient_name &&
          !existing.recipients.includes(o.recipient_name)
        ) {
          existing.recipients.push(o.recipient_name);
        }
        if (meta.crm_notes && !existing.notes.includes(meta.crm_notes)) {
          existing.notes.push(meta.crm_notes);
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.totalSpentCents - a.totalSpentCents,
    );
  }, [orders]);

  function handleStatusChange(orderId: Uuid, nextStatus: OrderStatus) {
    setActionMessage(null);
    startTransition(async () => {
      const res = await updateOrderStatusAction(orderId, nextStatus);
      if (!res.ok) {
        setActionMessage({
          orderId,
          type: "error",
          text: res.error ?? "Error al actualizar estado.",
        });
        return;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: nextStatus,
                paid_at: nextStatus === "PAID" ? new Date().toISOString() : o.paid_at,
              }
            : o,
        ),
      );
      const extras: string[] = [];
      if (res.emailSent) extras.push("Correo enviado al cliente");
      else if (res.emailError) extras.push(`Aviso email: ${res.emailError}`);
      if (res.crmSynced) extras.push("Sincronizado con CRM");

      setActionMessage({
        orderId,
        type: "ok",
        text: `Estado actualizado a "${ORDER_STATUS_LABELS[nextStatus]}"${
          extras.length ? ` · ${extras.join(" · ")}` : ""
        }.`,
      });
    });
  }

  function handleGenerateTropiPayLink(orderId: Uuid) {
    setActionMessage(null);
    startTransition(async () => {
      const res = await generateOrderTropiPayLinkAction(orderId);
      if (!res.ok) {
        setActionMessage({ orderId, type: "error", text: res.error });
        return;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                payment_link_url: res.paymentLinkUrl,
                payment_provider: "TROPIPAY",
                status: o.status === "PENDING_CONFIRMATION" ? "AWAITING_PAYMENT" : o.status,
              }
            : o,
        ),
      );
      setActionMessage({
        orderId,
        type: "ok",
        text: "Enlace de pago TropiPay generado y guardado.",
      });
    });
  }

  function handleSaveOrderCrmDetails(order: AdminOrderRow) {
    const meta = parseOrderTrackingMeta(order.webhook_payload);
    const buyerEmail = emailDrafts[order.id] ?? order.buyer_email ?? "";
    const crmNotes = noteDrafts[order.id] ?? meta.crm_notes ?? "";

    setActionMessage(null);
    startTransition(async () => {
      const res = await saveOrderCrmDetailsAction({
        orderId: order.id,
        buyerEmail,
        crmNotes,
      });
      if (!res.ok) {
        setActionMessage({ orderId: order.id, type: "error", text: res.error });
        return;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                buyer_email: buyerEmail.trim() || null,
                webhook_payload: {
                  ...parseOrderTrackingMeta(o.webhook_payload),
                  crm_notes: crmNotes.trim(),
                },
              }
            : o,
        ),
      );
      setActionMessage({
        orderId: order.id,
        type: "ok",
        text: "Email y notas CRM del pedido guardados.",
      });
    });
  }

  function handleSendManualEmail(order: AdminOrderRow) {
    const defaultStatus: NotifiableOrderStatus =
      order.status === "PENDING_CONFIRMATION"
        ? "AWAITING_PAYMENT"
        : (order.status as NotifiableOrderStatus);
    const chosenStatus = manualTemplateStatus[order.id] ?? defaultStatus;
    const buyerEmail = (emailDrafts[order.id] ?? order.buyer_email ?? "").trim();

    setActionMessage(null);
    startTransition(async () => {
      const res = await sendOrderEmailManualAction({
        orderId: order.id,
        statusTemplate: chosenStatus,
        buyerEmail,
      });
      if (!res.ok) {
        setActionMessage({ orderId: order.id, type: "error", text: res.error });
        return;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, buyer_email: buyerEmail || o.buyer_email } : o,
        ),
      );
      setActionMessage({
        orderId: order.id,
        type: "ok",
        text: res.message,
      });
    });
  }

  function handleManualCrmSync(orderId: Uuid) {
    setActionMessage(null);
    startTransition(async () => {
      const res = await syncOrderCrmManualAction(orderId);
      if (!res.ok) {
        setActionMessage({ orderId, type: "error", text: res.error });
        return;
      }
      setActionMessage({ orderId, type: "ok", text: res.message });
    });
  }

  function getOrderQuoteDraft(order: AdminOrderRow): OrderQuoteDraft {
    return quoteDrafts[order.id] ?? buildInitialQuoteDraft(order);
  }

  function updateOrderQuoteDraft(
    order: AdminOrderRow,
    updater: (current: OrderQuoteDraft) => OrderQuoteDraft,
  ) {
    setQuoteDrafts((prev) => {
      const current = prev[order.id] ?? buildInitialQuoteDraft(order);
      return {
        ...prev,
        [order.id]: updater(current),
      };
    });
  }

  function handleSaveOrderQuote(
    order: AdminOrderRow,
    opts: { regenerateTropiPayLink?: boolean; sendEmail?: boolean } = {},
  ) {
    const draft = getOrderQuoteDraft(order);
    const deliveryFeeCents = parseUsdToCents(draft.deliveryUsd);
    const discountCents = parseUsdToCents(draft.discountUsd);
    const extraFees: OrderExtraFeeLine[] = draft.extraFees
      .map((f, idx) => ({
        id: f.id || `extra_${idx + 1}`,
        label: f.label.trim(),
        amount_cents: parseUsdToCents(f.amountUsd),
      }))
      .filter((f) => f.label.length > 0 && f.amount_cents > 0);

    setActionMessage(null);
    startTransition(async () => {
      const res = await updateOrderFeesAndQuoteAction({
        orderId: order.id,
        deliveryFeeCents,
        deliveryZoneName: draft.zoneName,
        extraFees,
        discountCents,
        discountLabel: draft.discountLabel,
        adminQuoteNote: draft.quoteNote,
        regenerateTropiPayLink: opts.regenerateTropiPayLink,
        sendEmail: opts.sendEmail,
      });
      if (!res.ok) {
        setActionMessage({ orderId: order.id, type: "error", text: res.error });
        return;
      }

      const extraFeesTotal = extraFees.reduce((s, f) => s + f.amount_cents, 0);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== order.id) return o;
          const prevMeta = parseOrderTrackingMeta(o.webhook_payload);
          return {
            ...o,
            delivery_fee_cents: deliveryFeeCents,
            payment_fee_cents: extraFeesTotal,
            total_cents: res.totalCents,
            delivery_zone_name:
              draft.zoneName.trim() ||
              (deliveryFeeCents > 0 ? "Envío cotizado" : o.delivery_zone_name),
            payment_link_url: res.paymentLinkUrl ?? o.payment_link_url,
            payment_provider:
              opts.regenerateTropiPayLink && res.paymentLinkUrl
                ? "TROPIPAY"
                : o.payment_provider,
            status:
              opts.regenerateTropiPayLink &&
              res.paymentLinkUrl &&
              o.status === "PENDING_CONFIRMATION"
                ? "AWAITING_PAYMENT"
                : o.status,
            webhook_payload: {
              ...prevMeta,
              fee_breakdown: {
                shipping_mode: prevMeta.fee_breakdown?.shipping_mode ?? "ADMIN_QUOTE_LATER",
                shipping_quoted: true,
                extra_fees: extraFees,
                discount_cents: discountCents,
                discount_label: draft.discountLabel.trim() || null,
                admin_quote_note: draft.quoteNote.trim() || null,
                quoted_at: new Date().toISOString(),
              },
            },
          };
        }),
      );

      const parts = [`Cotización guardada ($${formatCents(res.totalCents)} USD).`];
      if (opts.regenerateTropiPayLink && res.paymentLinkUrl) {
        parts.push("Enlace de pago TropiPay actualizado.");
      }
      if (res.emailSent) {
        parts.push("Correo enviado al cliente.");
      }
      if (res.warning) {
        parts.push(res.warning);
      }

      setActionMessage({
        orderId: order.id,
        type: res.warning ? "error" : "ok",
        text: parts.join(" "),
      });
    });
  }

  function toggleMethod(method: PaymentMethod) {
    setMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
    );
  }

  function handleSaveStoreSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsFeedback(null);
    const nextCheckoutConfig: StoreCheckoutConfig = {
      ...checkoutConfig,
      fixed_shipping_fee_cents: parseUsdToCents(fixedShippingUsd),
      default_extra_fees: extraFeeRulesDraft
        .map((rule, idx) => ({
          id: rule.id || `rule_${idx + 1}`,
          label: rule.label.trim().slice(0, 60),
          amount_cents: parseUsdToCents(rule.amountUsd),
          enabled: rule.enabled,
        }))
        .filter((r) => r.label.length > 0),
    };

    startTransition(async () => {
      const res = await updateStorePaymentSettingsAction({
        saveOrders: saveOrdersToggle,
        paymentProvider: provider,
        paymentMethods: methods,
        orderPrefix,
        currency: storeCurrency,
        checkoutConfig: nextCheckoutConfig,
      });
      if (!res.ok) {
        setSettingsFeedback({ type: "error", text: res.error });
      } else {
        setCheckoutConfig(nextCheckoutConfig);
        setSettingsFeedback({
          type: "ok",
          text: "Configuración de pedidos, carrito, envío y métodos de pago guardada.",
        });
      }
    });
  }

  function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setSettingsFeedback(null);
    startTransition(async () => {
      const res = await saveStoreTropiPayCredentialsAction({
        clientId: tropiClientId,
        clientSecret: tropiClientSecret,
        env: tropiEnv,
      });
      if (!res.ok) {
        setSettingsFeedback({ type: "error", text: res.error });
      } else {
        setTropiClientSecret("");
        setSettingsFeedback({
          type: "ok",
          text: "Credenciales de TropiPay guardadas para esta tienda.",
        });
      }
    });
  }

  function handleTestConnection() {
    setSettingsFeedback(null);
    startTransition(async () => {
      const res = await testStoreTropiPayConnectionAction();
      if (!res.ok) {
        setSettingsFeedback({ type: "error", text: res.error });
      } else {
        setSettingsFeedback({ type: "ok", text: res.message });
      }
    });
  }

  function handleSaveEmailTemplates(e: React.FormEvent) {
    e.preventDefault();
    setTemplateFeedback(null);
    startTransition(async () => {
      const res = await saveStoreEmailTemplatesAction(templates);
      if (!res.ok) {
        setTemplateFeedback({ type: "error", text: res.error });
      } else {
        setTemplateFeedback({
          type: "ok",
          text: "Plantillas de correo personalizadas guardadas correctamente.",
        });
      }
    });
  }

  function handleSaveIntegrations(e: React.FormEvent) {
    e.preventDefault();
    setTemplateFeedback(null);
    startTransition(async () => {
      const res = await saveStoreIntegrationsAction({
        resendApiKey,
        resendFromEmail,
        crmProvider,
        crmApiKey,
        crmWebhookUrl,
      });
      if (!res.ok) {
        setTemplateFeedback({ type: "error", text: res.error });
      } else {
        setResendApiKey("");
        setCrmApiKey("");
        setTemplateFeedback({
          type: "ok",
          text: "Configuración de correos (Resend) y CRM externo guardada.",
        });
      }
    });
  }

  const currentEditingTemplate = templates[selectedTemplateStatus];
  const samplePreviewVars = {
    buyer_name: "Ana Pérez",
    order_code: "#DEL-1024",
    store_name: storeName,
    total_usd: "$42.00 USD",
    items_summary: "Pastel Red Velvet (8 a 10 raciones) x1",
    recipient_name: "María Pérez",
    delivery_address: "Calle 23 #456, Vedado, Plaza de la Revolución",
    delivery_date: "2026-05-10",
    delivery_slot: "Tarde (2:00 PM - 6:00 PM)",
    tracking_url: "https://dulce-delia.vercel.app/pedido/DEL-1024",
    payment_url: "https://tppay.me/ejemplo",
  };

  return (
    <section className="space-y-5">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            Gestión de Pagos, Pedidos y CRM
          </h1>
          <p className="text-xs text-stone-500">
            Seguimiento integral de pagos TropiPay, notificaciones por correo y ficha de clientes de {storeName}.
          </p>
        </div>

        <span className="flex items-center gap-2 text-xs text-stone-500" role="status">
          <span
            aria-hidden
            className={`size-2 rounded-full ${
              live === "live"
                ? "bg-emerald-500"
                : live === "offline"
                  ? "bg-(--brand)"
                  : "animate-pulse bg-stone-400"
            }`}
          />
          {live === "live"
            ? "Tiempo real activo"
            : live === "offline"
              ? "Sin conexión en vivo"
              : "Conectando…"}
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "orders"
              ? "bg-stone-900 text-white"
              : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          Pedidos y Pagos ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("crm")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "crm"
              ? "bg-stone-900 text-white"
              : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          Clientes CRM ({crmContacts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "templates"
              ? "bg-stone-900 text-white"
              : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          Plantillas de Email, CRM Externo y TropiPay
        </button>
      </div>

      {/* TAB 1: ORDERS & PAYMENTS */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Payment & Order KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                Pagados / Confirmados
              </p>
              <p className="mt-1 text-lg font-extrabold text-emerald-950">
                ${formatCents(kpis.paidCents)} USD
              </p>
              <p className="text-xs text-emerald-700">{kpis.paidCount} pedidos pagados</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                Por cobrar (Pendientes)
              </p>
              <p className="mt-1 text-lg font-extrabold text-amber-950">
                ${formatCents(kpis.unpaidCents)} USD
              </p>
              <p className="text-xs text-amber-800">{kpis.unpaidCount} esperando pago</p>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-800">
                En obrador / reparto
              </p>
              <p className="mt-1 text-lg font-extrabold text-sky-950">
                {kpis.activeDeliveryCount}
              </p>
              <p className="text-xs text-sky-700">En preparación o en camino</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Clientes únicos
              </p>
              <p className="mt-1 text-lg font-extrabold text-stone-900">
                {crmContacts.length}
              </p>
              <p className="text-xs text-stone-500">En directorio CRM</p>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "ALL", label: "Todos" },
                  { id: "PAID", label: "Pagados" },
                  { id: "UNPAID", label: "Pago pendiente" },
                  { id: "ACTIVE", label: "En curso" },
                  { id: "DELIVERED", label: "Entregados" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                    orderFilter === f.id
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por #código, comprador, email o destinatario..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs sm:w-72"
            />
          </div>

          {!savesOrders ? (
            <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
              Esta tienda no guarda pedidos en línea: los clientes piden directo por WhatsApp.
            </p>
          ) : null}

          {loadError ? (
            <p role="alert" className="text-sm text-(--brand)">
              No se pudieron cargar los pedidos: {loadError}
            </p>
          ) : null}

          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {filteredOrders.map((order) => {
              const isExpanded = expandedId === order.id;
              const paid = isOrderPaid(order);
              const buyerWaHref = buildBuyerWhatsAppHref(order, storeName);
              const feedback =
                actionMessage?.orderId === order.id ? actionMessage : null;
              const meta = parseOrderTrackingMeta(order.webhook_payload);
              const emailLogs = meta.email_logs ?? [];
              const trackingToken = order.tracking_token ?? meta.tracking_token;
              const trackingPath = trackingToken
                ? `/pedido/${encodeURIComponent(trackingToken)}`
                : "/pedido";
              const currentEmailDraft =
                emailDrafts[order.id] ?? order.buyer_email ?? "";
              const currentNoteDraft =
                noteDrafts[order.id] ?? meta.crm_notes ?? "";
              const selectedManualStatus: NotifiableOrderStatus =
                manualTemplateStatus[order.id] ??
                (order.status === "PENDING_CONFIRMATION"
                  ? "AWAITING_PAYMENT"
                  : (order.status as NotifiableOrderStatus));

              return (
                <li
                  key={order.id}
                  className={`transition-colors ${
                    freshIds.has(order.id) ? "bg-amber-50/70" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-stone-50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold tabular-nums text-stone-900">
                          #{order.order_code}
                        </span>
                        {order.buyer_name && (
                          <span className="truncate text-sm text-stone-700">
                            · {order.buyer_name}
                          </span>
                        )}
                        {order.buyer_email && (
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">
                            {order.buyer_email}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            paid
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {paid ? "✓ Pagado" : "⏳ Pago pendiente"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {dateFormat.format(new Date(order.created_at))}
                        {order.delivery_date
                          ? ` · Entrega: ${order.delivery_date} (${order.delivery_time_slot})`
                          : ""}
                        {order.recipient_name
                          ? ` · Recibe: ${order.recipient_name}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums text-stone-900">
                        ${formatCents(order.total_cents)}{" "}
                        <span className="text-xs font-normal text-stone-500">
                          {order.currency}
                        </span>
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-stone-100 bg-stone-50/60 px-4 py-4 text-sm">
                      {/* Customer Tracking Page Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
                        <div className="text-xs">
                          <span className="font-semibold text-stone-800">
                            Página pública de seguimiento del cliente:
                          </span>{" "}
                          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-700">
                            {trackingPath}
                          </code>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const fullUrl = `${window.location.origin}${trackingPath}`;
                              void navigator.clipboard?.writeText(fullUrl);
                              setActionMessage({
                                orderId: order.id,
                                type: "ok",
                                text: "Enlace de seguimiento copiado al portapapeles.",
                              });
                            }}
                            className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Copiar link de seguimiento
                          </button>
                          <a
                            href={trackingPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-medium text-white no-underline hover:bg-stone-800"
                          >
                            Ver página del cliente ↗
                          </a>
                        </div>
                      </div>

                      {/* Items & Fee Breakdown */}
                      {order.items && order.items.length > 0 && (
                        <div className="rounded-xl border border-stone-200 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                            Productos del pedido
                          </p>
                          <ul className="space-y-1.5">
                            {order.items.map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start justify-between gap-2 text-sm"
                              >
                                <span>
                                  <strong>{item.quantity}×</strong> {item.name}
                                  {item.presentation_label
                                    ? ` (${item.presentation_label})`
                                    : ""}
                                </span>
                                <span className="font-medium tabular-nums">
                                  ${formatCents(item.line_total_cents)}
                                </span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-3 space-y-1 border-t border-stone-100 pt-2 text-xs text-stone-600">
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span className="tabular-nums font-medium">
                                ${formatCents(order.subtotal_cents ?? 0)} {order.currency}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>
                                Envío{order.delivery_zone_name ? ` (${order.delivery_zone_name})` : ""}
                              </span>
                              <span className="tabular-nums font-medium">
                                {meta.fee_breakdown?.shipping_quoted === false &&
                                (order.delivery_fee_cents ?? 0) === 0
                                  ? "Por confirmar / cotizar"
                                  : `$${formatCents(order.delivery_fee_cents ?? 0)} ${order.currency}`}
                              </span>
                            </div>
                            {(meta.fee_breakdown?.extra_fees ?? []).map((fee) => (
                              <div key={fee.id} className="flex justify-between">
                                <span>{fee.label}</span>
                                <span className="tabular-nums font-medium">
                                  +${formatCents(fee.amount_cents)} {order.currency}
                                </span>
                              </div>
                            ))}
                            {(meta.fee_breakdown?.discount_cents ?? 0) > 0 && (
                              <div className="flex justify-between text-emerald-700">
                                <span>
                                  Descuento
                                  {meta.fee_breakdown?.discount_label
                                    ? ` (${meta.fee_breakdown.discount_label})`
                                    : ""}
                                </span>
                                <span className="tabular-nums font-semibold">
                                  -${formatCents(meta.fee_breakdown?.discount_cents ?? 0)} {order.currency}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-stone-200 pt-1 text-sm font-bold text-stone-900">
                              <span>Total</span>
                              <span className="tabular-nums">
                                ${formatCents(order.total_cents)} {order.currency}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Admin Fee Quote & Shipping Calculator (when not paid/delivered/cancelled) */}
                      {!paid && order.status !== "CANCELLED" && (() => {
                        const qDraft = getOrderQuoteDraft(order);
                        const previewDelivery = parseUsdToCents(qDraft.deliveryUsd);
                        const previewExtra = qDraft.extraFees.reduce(
                          (s, f) => s + (f.label.trim() ? parseUsdToCents(f.amountUsd) : 0),
                          0,
                        );
                        const previewDiscount = parseUsdToCents(qDraft.discountUsd);
                        const previewTotal = Math.max(
                          0,
                          (order.subtotal_cents ?? 0) + previewDelivery + previewExtra - previewDiscount,
                        );

                        return (
                          <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                                  Cotizar envío, cargos extras y descuentos
                                </p>
                                <p className="text-[11px] text-amber-800/80">
                                  Ajusta el envío o cargos manuales, actualiza el enlace de TropiPay y envíaselo al cliente en 1 clic por WhatsApp.
                                </p>
                              </div>
                              <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold tabular-nums text-stone-900 shadow-2xs">
                                Nuevo total: ${formatCents(previewTotal)} {order.currency}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-medium text-stone-600">
                                  Envío (USD)
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={qDraft.deliveryUsd}
                                  onChange={(e) =>
                                    updateOrderQuoteDraft(order, (cur) => ({
                                      ...cur,
                                      deliveryUsd: e.target.value,
                                    }))
                                  }
                                  placeholder="0.00"
                                  className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs tabular-nums"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-medium text-stone-600">
                                  Zona / Etiqueta envío
                                </span>
                                <input
                                  type="text"
                                  value={qDraft.zoneName}
                                  onChange={(e) =>
                                    updateOrderQuoteDraft(order, (cur) => ({
                                      ...cur,
                                      zoneName: e.target.value,
                                    }))
                                  }
                                  placeholder="Ej. Vedado / Mensajero"
                                  className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-medium text-stone-600">
                                  Descuento (USD)
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={qDraft.discountUsd}
                                  onChange={(e) =>
                                    updateOrderQuoteDraft(order, (cur) => ({
                                      ...cur,
                                      discountUsd: e.target.value,
                                    }))
                                  }
                                  placeholder="0.00"
                                  className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs tabular-nums"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-medium text-stone-600">
                                  Motivo descuento
                                </span>
                                <input
                                  type="text"
                                  value={qDraft.discountLabel}
                                  onChange={(e) =>
                                    updateOrderQuoteDraft(order, (cur) => ({
                                      ...cur,
                                      discountLabel: e.target.value,
                                    }))
                                  }
                                  placeholder="Ej. Cliente VIP"
                                  className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                                />
                              </label>
                            </div>

                            {/* Extra fee lines */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-stone-600">
                                  Cargos adicionales (empaque, vela, entrega especial, etc.)
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateOrderQuoteDraft(order, (cur) => ({
                                      ...cur,
                                      extraFees: [
                                        ...cur.extraFees,
                                        {
                                          id: `extra_${Date.now()}`,
                                          label: "",
                                          amountUsd: "0.00",
                                        },
                                      ],
                                    }))
                                  }
                                  className="cursor-pointer rounded-md border border-stone-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
                                >
                                  + Añadir cargo
                                </button>
                              </div>
                              {qDraft.extraFees.map((fee, idx) => (
                                <div key={fee.id} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={fee.label}
                                    onChange={(e) =>
                                      updateOrderQuoteDraft(order, (cur) => ({
                                        ...cur,
                                        extraFees: cur.extraFees.map((item, i) =>
                                          i === idx ? { ...item, label: e.target.value } : item,
                                        ),
                                      }))
                                    }
                                    placeholder="Concepto del cargo"
                                    className="flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs"
                                  />
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={fee.amountUsd}
                                    onChange={(e) =>
                                      updateOrderQuoteDraft(order, (cur) => ({
                                        ...cur,
                                        extraFees: cur.extraFees.map((item, i) =>
                                          i === idx ? { ...item, amountUsd: e.target.value } : item,
                                        ),
                                      }))
                                    }
                                    placeholder="0.00"
                                    className="w-24 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs tabular-nums"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateOrderQuoteDraft(order, (cur) => ({
                                        ...cur,
                                        extraFees: cur.extraFees.filter((_, i) => i !== idx),
                                      }))
                                    }
                                    className="cursor-pointer rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-500 hover:text-red-600"
                                    aria-label="Quitar cargo"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>

                            <label className="block">
                              <span className="mb-1 block text-[11px] font-medium text-stone-600">
                                Nota visible para el cliente en WhatsApp y seguimiento
                              </span>
                              <input
                                type="text"
                                value={qDraft.quoteNote}
                                onChange={(e) =>
                                  updateOrderQuoteDraft(order, (cur) => ({
                                    ...cur,
                                    quoteNote: e.target.value,
                                  }))
                                }
                                placeholder="Ej. Incluye entrega refrigerada hasta la puerta"
                                className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                              />
                            </label>

                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handleSaveOrderQuote(order, {
                                    regenerateTropiPayLink: false,
                                    sendEmail: false,
                                  })
                                }
                                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                              >
                                Guardar cotización
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handleSaveOrderQuote(order, {
                                    regenerateTropiPayLink: true,
                                    sendEmail: false,
                                  })
                                }
                                className="cursor-pointer rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                              >
                                Guardar y generar/actualizar link TropiPay
                              </button>
                              {order.buyer_email && (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() =>
                                    handleSaveOrderQuote(order, {
                                      regenerateTropiPayLink: true,
                                      sendEmail: true,
                                    })
                                  }
                                  className="cursor-pointer rounded-lg border border-(--brand) bg-white px-3 py-1.5 text-xs font-semibold text-(--brand) hover:bg-rose-50 disabled:opacity-50"
                                >
                                  Guardar, generar link y enviar email
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Buyer & Recipient details */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-stone-200 bg-white p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
                            Comprador (Quién envía)
                          </p>
                          <p className="font-medium text-stone-900">
                            {order.buyer_name || "Sin especificar"}
                          </p>
                          <p className="text-xs text-stone-600">
                            Tel: {order.buyer_phone || "Sin especificar"}
                          </p>
                          <p className="text-xs text-stone-600">
                            Email: {order.buyer_email || "Sin correo registrado"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-stone-200 bg-white p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
                            Entrega en La Habana
                          </p>
                          <p className="font-medium text-stone-900">
                            {order.recipient_name || "Sin especificar"} (
                            {order.recipient_phone || "Sin teléfono"})
                          </p>
                          <p className="text-xs text-stone-600">
                            {order.delivery_address || "Dirección por confirmar"}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {order.delivery_date} · {order.delivery_time_slot}
                          </p>
                        </div>
                      </div>

                      {order.card_message && (
                        <div className="rounded-xl border border-stone-200 bg-white p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
                            Dedicatoria / Mensaje
                          </p>
                          <p className="italic text-stone-800">“{order.card_message}”</p>
                        </div>
                      )}

                      {/* Payment & TropiPay section */}
                      <div className="space-y-2.5 rounded-xl border border-stone-200 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                            Pago ({order.payment_provider || order.preferred_payment_method || "WhatsApp"})
                          </span>
                          {order.paid_at ? (
                            <span className="text-xs font-semibold text-emerald-700">
                              ✓ Pagado el {dateFormat.format(new Date(order.paid_at))}
                              {order.external_payment_id
                                ? ` · Ref #${order.external_payment_id}`
                                : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-700">
                              ⏳ Pago aún no acreditado
                            </span>
                          )}
                        </div>

                        {order.payment_link_url && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={order.payment_link_url}
                              onFocus={(e) => e.currentTarget.select()}
                              className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-700"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                void navigator.clipboard?.writeText(
                                  order.payment_link_url ?? "",
                                );
                                setActionMessage({
                                  orderId: order.id,
                                  type: "ok",
                                  text: "Enlace de pago copiado al portapapeles.",
                                });
                              }}
                              className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                            >
                              Copiar link
                            </button>
                            <a
                              href={order.payment_link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white no-underline hover:bg-stone-800"
                            >
                              Abrir TropiPay ↗
                            </a>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleGenerateTropiPayLink(order.id)}
                            className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                          >
                            {order.payment_link_url
                              ? "Regenerar link de TropiPay"
                              : "Generar link de pago TropiPay"}
                          </button>

                          {buyerWaHref && (
                            <a
                              href={buyerWaHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-emerald-700"
                            >
                              {order.payment_link_url
                                ? "Enviar cotización y link por WhatsApp"
                                : "Escribir al comprador por WhatsApp"}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Status workflow buttons */}
                      <div className="rounded-xl border border-stone-200 bg-white p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                            Cambiar estado del pedido (envía email automático al cliente)
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_STATUSES.map((st) => {
                            const active = order.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                disabled={isPending || active}
                                onClick={() => handleStatusChange(order.id, st)}
                                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition ${
                                  active
                                    ? `${STATUS_STYLES[st]} ring-2 ring-stone-900/20 font-bold`
                                    : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                                }`}
                              >
                                {ORDER_STATUS_LABELS[st]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Email Notification & CRM Panel per Order */}
                      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                            Notificaciones por Email y Ficha CRM
                          </p>
                          <div className="flex items-center gap-2">
                            {meta.crm_sync && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                  meta.crm_sync.ok
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-red-50 text-red-800"
                                }`}
                              >
                                CRM ({meta.crm_sync.provider}):{" "}
                                {meta.crm_sync.ok ? "Sincronizado" : "Error"}
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleManualCrmSync(order.id)}
                              className="cursor-pointer rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100"
                            >
                              Sincronizar CRM externo
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-stone-600">
                              Correo del comprador (para estados y seguimiento)
                            </span>
                            <input
                              type="email"
                              value={currentEmailDraft}
                              onChange={(e) =>
                                setEmailDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              placeholder="cliente@correo.com"
                              className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-stone-600">
                              Notas internas CRM (preferencias, seguimiento)
                            </span>
                            <input
                              type="text"
                              value={currentNoteDraft}
                              onChange={(e) =>
                                setNoteDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              placeholder="Ej. Cliente frecuente en Miami, prefiere entrega 3pm"
                              className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs"
                            />
                          </label>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleSaveOrderCrmDetails(order)}
                            className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                          >
                            Guardar email y nota CRM
                          </button>

                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={selectedManualStatus}
                              onChange={(e) =>
                                setManualTemplateStatus((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value as NotifiableOrderStatus,
                                }))
                              }
                              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                            >
                              {NOTIFIABLE_STATUSES.map((item) => (
                                <option key={item.status} value={item.status}>
                                  Plantilla: {item.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleSendManualEmail(order)}
                              className="cursor-pointer rounded-lg bg-(--brand) px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                            >
                              Enviar email de estado ahora
                            </button>
                          </div>
                        </div>

                        {emailLogs.length > 0 && (
                          <div className="border-t border-stone-100 pt-2">
                            <p className="mb-1 text-[11px] font-semibold text-stone-500">
                              Historial de emails enviados ({emailLogs.length}):
                            </p>
                            <ul className="space-y-1 text-[11px] text-stone-600">
                              {emailLogs.slice(0, 5).map((log, i) => (
                                <li key={i} className="flex items-center justify-between gap-2">
                                  <span>
                                    {log.ok ? "✓" : "⚠"} <strong>{ORDER_STATUS_LABELS[log.status]}</strong> → {log.to}
                                    {log.error ? ` (${log.error})` : ""}
                                  </span>
                                  <span className="text-stone-400">
                                    {dateFormat.format(new Date(log.timestamp))}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {feedback && (
                        <p
                          role="status"
                          className={`rounded-xl px-3 py-2 text-xs font-medium ${
                            feedback.type === "ok"
                              ? "bg-emerald-50 text-emerald-900"
                              : "bg-red-50 text-red-800"
                          }`}
                        >
                          {feedback.text}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}

            {filteredOrders.length === 0 && !loadError ? (
              <li className="px-4 py-10 text-center text-sm text-stone-500">
                No se encontraron pedidos con el filtro actual.
              </li>
            ) : null}
          </ul>
        </div>
      )}

      {/* TAB 2: BUILT-IN CRM */}
      {activeTab === "crm" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Directorio de Clientes (CRM Integrado)
              </h2>
              <p className="text-xs text-stone-500">
                Clientes agrupados automáticamente por correo o teléfono, con valor histórico de compras (LTV), destinatarios en Cuba y notas de seguimiento.
              </p>
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente por nombre, email o teléfono..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs sm:w-72"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Pedidos</th>
                  <th className="px-4 py-3">Total (LTV)</th>
                  <th className="px-4 py-3">Destinatarios en La Habana</th>
                  <th className="px-4 py-3">Último pedido</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {crmContacts
                  .filter((c) => {
                    const q = searchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      c.name.toLowerCase().includes(q) ||
                      (c.email ?? "").toLowerCase().includes(q) ||
                      c.phone.toLowerCase().includes(q) ||
                      c.recipients.join(" ").toLowerCase().includes(q)
                    );
                  })
                  .map((contact) => {
                    const digits = contact.phone.replace(/\D/g, "");
                    const waHref =
                      digits.length >= 7
                        ? `https://wa.me/${digits}?text=${encodeURIComponent(
                            `Hola ${contact.name}, te saludamos de ${storeName}.`,
                          )}`
                        : null;

                    return (
                      <tr key={contact.key} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-900">{contact.name}</p>
                          {contact.notes.length > 0 && (
                            <p className="mt-0.5 text-[11px] italic text-stone-500">
                              Nota: {contact.notes[0]}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-stone-700">{contact.phone}</p>
                          {contact.email ? (
                            <p className="text-stone-500">{contact.email}</p>
                          ) : (
                            <span className="text-[11px] text-amber-700">Sin email</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{contact.ordersCount}</span>{" "}
                          <span className="text-stone-500">
                            ({contact.paidOrdersCount} pagados)
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold tabular-nums text-stone-900">
                          ${formatCents(contact.totalSpentCents)} USD
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {contact.recipients.slice(0, 3).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-stone-800">
                            #{contact.lastOrderCode}
                          </span>{" "}
                          <span
                            className={`ml-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[contact.lastOrderStatus]}`}
                          >
                            {ORDER_STATUS_LABELS[contact.lastOrderStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery(contact.email || contact.phone || contact.name);
                                setOrderFilter("ALL");
                                setActiveTab("orders");
                              }}
                              className="cursor-pointer rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                            >
                              Ver pedidos
                            </button>
                            {waHref && (
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white no-underline hover:bg-emerald-700"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMIZABLE EMAIL TEMPLATES + CRM & TROPIPAY SETTINGS */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Customizable Email Templates Editor */}
          <form
            onSubmit={handleSaveEmailTemplates}
            className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Plantillas Personalizables de Email por Estado del Pedido
                </h2>
                <p className="text-xs text-stone-500">
                  Personaliza el asunto, título, mensaje y botón que recibe el cliente cuando su pedido cambia de estado.
                </p>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="cursor-pointer rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
              >
                Guardar todas las plantillas
              </button>
            </div>

            {/* Status selector pills */}
            <div className="flex flex-wrap gap-1.5">
              {NOTIFIABLE_STATUSES.map((item) => {
                const active = selectedTemplateStatus === item.status;
                const enabled = templates[item.status]?.enabled !== false;
                return (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => setSelectedTemplateStatus(item.status)}
                    className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-(--brand) text-white shadow-xs"
                        : "border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    {enabled ? "● " : "○ "}
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl bg-stone-50 px-3.5 py-2.5 text-xs text-stone-600">
              <strong>Cuándo se envía:</strong>{" "}
              {NOTIFIABLE_STATUSES.find((s) => s.status === selectedTemplateStatus)?.description}
            </div>

            {/* Variables helper bar */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-stone-600">
                Variables disponibles (haz clic para insertar en el cuerpo del mensaje):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EMAIL_TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() =>
                      setTemplates((prev) => ({
                        ...prev,
                        [selectedTemplateStatus]: {
                          ...prev[selectedTemplateStatus],
                          body: `${prev[selectedTemplateStatus].body} ${v.token}`,
                        },
                      }))
                    }
                    className="cursor-pointer rounded-lg border border-stone-200 bg-white px-2 py-1 font-mono text-[11px] text-stone-700 hover:bg-stone-100"
                    title={v.description}
                  >
                    {v.token}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor & Live Preview Grid */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-800">
                  <span>
                    Enviar automáticamente al pasar a «
                    {ORDER_STATUS_LABELS[selectedTemplateStatus]}»
                  </span>
                  <input
                    type="checkbox"
                    checked={currentEditingTemplate.enabled}
                    onChange={(e) =>
                      setTemplates((prev) => ({
                        ...prev,
                        [selectedTemplateStatus]: {
                          ...prev[selectedTemplateStatus],
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="size-4 accent-(--brand)"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-stone-600">
                    Asunto del correo (Subject)
                  </span>
                  <input
                    type="text"
                    value={currentEditingTemplate.subject}
                    onChange={(e) =>
                      setTemplates((prev) => ({
                        ...prev,
                        [selectedTemplateStatus]: {
                          ...prev[selectedTemplateStatus],
                          subject: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-stone-600">
                    Encabezado principal (Heading)
                  </span>
                  <input
                    type="text"
                    value={currentEditingTemplate.heading}
                    onChange={(e) =>
                      setTemplates((prev) => ({
                        ...prev,
                        [selectedTemplateStatus]: {
                          ...prev[selectedTemplateStatus],
                          heading: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-stone-600">
                    Cuerpo del mensaje
                  </span>
                  <textarea
                    rows={7}
                    value={currentEditingTemplate.body}
                    onChange={(e) =>
                      setTemplates((prev) => ({
                        ...prev,
                        [selectedTemplateStatus]: {
                          ...prev[selectedTemplateStatus],
                          body: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs leading-relaxed"
                  />
                </label>

                <div className="flex items-center justify-between gap-3">
                  <label className="flex-1">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Texto del botón (CTA)
                    </span>
                    <input
                      type="text"
                      value={currentEditingTemplate.ctaLabel}
                      onChange={(e) =>
                        setTemplates((prev) => ({
                          ...prev,
                          [selectedTemplateStatus]: {
                            ...prev[selectedTemplateStatus],
                            ctaLabel: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setTemplates((prev) => ({
                        ...prev,
                        [selectedTemplateStatus]:
                          DEFAULT_EMAIL_TEMPLATES[selectedTemplateStatus],
                      }))
                    }
                    className="mt-5 cursor-pointer rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50"
                  >
                    Restaurar original
                  </button>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="rounded-2xl border border-[#E6DCD2] bg-[#FAF6F1] p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Vista previa en vivo del correo
                </p>
                <div className="mb-2 rounded-lg bg-white px-3 py-1.5 text-xs text-stone-700 shadow-2xs">
                  <strong>Asunto:</strong>{" "}
                  {interpolateEmailTemplate(
                    currentEditingTemplate.subject,
                    samplePreviewVars,
                  )}
                </div>
                <div className="overflow-hidden rounded-2xl border border-[#EADCD3] bg-white shadow-xs">
                  <div className="border-b border-[#EFE6DF] bg-[#FDF6F8] px-5 py-4">
                    <p className="m-0 text-[10px] font-bold tracking-[0.2em] uppercase text-[#B56576]">
                      {storeName}
                    </p>
                    <h3 className="m-0 mt-1 font-serif text-lg font-bold text-[#2E221D]">
                      {interpolateEmailTemplate(
                        currentEditingTemplate.heading,
                        samplePreviewVars,
                      )}
                    </h3>
                  </div>
                  <div className="space-y-2.5 px-5 py-4 text-xs leading-relaxed text-[#4A3A33]">
                    {interpolateEmailTemplate(
                      currentEditingTemplate.body,
                      samplePreviewVars,
                    )
                      .split(/\n+/)
                      .map((p, idx) => (
                        <p key={idx} className="m-0">
                          {p}
                        </p>
                      ))}
                    <div className="pt-3">
                      <span className="inline-block rounded-full bg-[#B56576] px-5 py-2.5 text-xs font-extrabold text-white">
                        {interpolateEmailTemplate(
                          currentEditingTemplate.ctaLabel,
                          samplePreviewVars,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {templateFeedback && (
              <p
                role="status"
                className={`rounded-xl px-3 py-2 text-xs font-medium ${
                  templateFeedback.type === "ok"
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {templateFeedback.text}
              </p>
            )}
          </form>

          {/* OWNER Integrations: Resend + External Free CRM + TropiPay */}
          {role === "OWNER" && (
            <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 text-sm">
              <form onSubmit={handleSaveIntegrations} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-stone-900">
                      Proveedores de Email (Resend) y CRM Externo Gratuito
                    </h3>
                    <p className="text-xs text-stone-500">
                      Conecta Resend (plan gratuito 3,000 emails/mes) y sincroniza clientes/pedidos con Brevo CRM Free, HubSpot CRM Free o un Webhook externo.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        integrationsSummary.resendConfigured
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {integrationsSummary.resendConfigured
                        ? "Resend conectado"
                        : "Resend pendiente"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        integrationsSummary.crmConfigured
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      CRM Externo: {integrationsSummary.crmProvider}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Resend API Key (<code>re_...</code>)
                    </span>
                    <input
                      type="password"
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder={
                        integrationsSummary.resendConfigured
                          ? "•••••••••••••••• (Ya configurada)"
                          : "re_123456789..."
                      }
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Remitente de correo (From Email)
                    </span>
                    <input
                      type="text"
                      value={resendFromEmail}
                      onChange={(e) => setResendFromEmail(e.target.value)}
                      placeholder="Dulce Delia <onboarding@resend.dev>"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Conector CRM Externo Gratuito
                    </span>
                    <select
                      value={crmProvider}
                      onChange={(e) => setCrmProvider(e.target.value as CrmProviderType)}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="NONE">Solo CRM interno del panel</option>
                      <option value="BREVO">Brevo CRM Gratuito (API v3 Contacts)</option>
                      <option value="HUBSPOT">HubSpot CRM Gratuito (Private App Token)</option>
                      <option value="WEBHOOK">Webhook CRM / Make / Zapier / n8n</option>
                    </select>
                  </label>

                  {(crmProvider === "BREVO" || crmProvider === "HUBSPOT") && (
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-stone-600">
                        {crmProvider === "BREVO"
                          ? "API Key de Brevo (xkeysib-...)"
                          : "Access Token de HubSpot (pat-na1-...)"}
                      </span>
                      <input
                        type="password"
                        value={crmApiKey}
                        onChange={(e) => setCrmApiKey(e.target.value)}
                        placeholder={
                          integrationsSummary.crmConfigured
                            ? "•••••••••••••••• (Guardada)"
                            : "Pega tu token API del CRM gratuito"
                        }
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
                      />
                    </label>
                  )}

                  {crmProvider === "WEBHOOK" && (
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-stone-600">
                        URL del Webhook CRM
                      </span>
                      <input
                        type="url"
                        value={crmWebhookUrl}
                        onChange={(e) => setCrmWebhookUrl(e.target.value)}
                        placeholder="https://hook.us1.make.com/..."
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="cursor-pointer rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  Guardar configuración de Email y CRM Externo
                </button>
              </form>

              <hr className="border-stone-200" />

              {/* Store Payment Settings, Cart Mode, Business Preset & Shipping */}
              <form onSubmit={handleSaveStoreSettings} className="space-y-4">
                <div>
                  <p className="font-semibold text-stone-800">
                    Flujo de pedidos, Carrito, Envío y Métodos de pago de {storeName}
                  </p>
                  <p className="text-xs text-stone-500">
                    Configura cómo compran tus clientes: pedido multi-producto (carrito a demanda) o compra directa por producto, tipo de negocio (Pastelería/Regalos, Restaurante o Tienda) y cuándo se calcula el envío.
                  </p>
                </div>

                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={saveOrdersToggle}
                    onChange={(e) => setSaveOrdersToggle(e.target.checked)}
                    className="size-4 accent-(--brand)"
                  />
                  <span>
                    Guardar pedidos en base de datos y confirmar pagos en{" "}
                    <strong>{storeName}</strong>
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Modo de pedido en tienda
                    </span>
                    <select
                      value={checkoutConfig.order_mode}
                      onChange={(e) =>
                        setCheckoutConfig((prev) => ({
                          ...prev,
                          order_mode: e.target.value as OrderMode,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="HYBRID">Pedido multi-producto a demanda (Recomendado)</option>
                      <option value="CART">Pedido multi-producto (Carrito)</option>
                      <option value="SINGLE_PRODUCT">Solo 1 producto directo (Sin carrito)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Tipo de negocio (Etiquetas y campos del checkout)
                    </span>
                    <select
                      value={checkoutConfig.business_preset}
                      onChange={(e) =>
                        setCheckoutConfig((prev) => ({
                          ...prev,
                          business_preset: e.target.value as BusinessPreset,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="BAKERY_GIFT">Pastelería / Regalos (Comprador + Destinatario + Dedicatoria)</option>
                      <option value="RESTAURANT">Restaurante / Comida (Dirección + Notas cocina + Hora)</option>
                      <option value="RETAIL">Tienda / Retail (Envío directo o recogida)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Cálculo del envío / domicilio
                    </span>
                    <select
                      value={checkoutConfig.shipping_fee_mode}
                      onChange={(e) =>
                        setCheckoutConfig((prev) => ({
                          ...prev,
                          shipping_fee_mode: e.target.value as ShippingFeeMode,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="ZONE_SELECTOR">Selector de zonas activas en checkout</option>
                      <option value="FIXED_AT_CHECKOUT">Tarifa fija automática en checkout</option>
                      <option value="ADMIN_QUOTE_LATER">Cotizar envío después desde Admin / WhatsApp</option>
                      <option value="NONE">Sin envío (Recogida o incluido)</option>
                    </select>
                  </label>
                </div>

                {checkoutConfig.shipping_fee_mode === "FIXED_AT_CHECKOUT" && (
                  <label className="block max-w-xs">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Tarifa fija de envío (USD)
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={fixedShippingUsd}
                      onChange={(e) => setFixedShippingUsd(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs tabular-nums"
                    />
                  </label>
                )}

                {checkoutConfig.shipping_fee_mode === "ADMIN_QUOTE_LATER" && (
                  <label className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs text-stone-800">
                    <input
                      type="checkbox"
                      checked={checkoutConfig.allow_immediate_payment_without_shipping}
                      onChange={(e) =>
                        setCheckoutConfig((prev) => ({
                          ...prev,
                          allow_immediate_payment_without_shipping: e.target.checked,
                        }))
                      }
                      className="size-4 accent-(--brand)"
                    />
                    <span>
                      Permitir pago inmediato online sin envío (el cliente paga los productos ahora y el envío se coordina después)
                    </span>
                  </label>
                )}

                {/* Default extra fees */}
                <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-stone-800">
                        Cargos adicionales automáticos al finalizar pedido
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Ejemplos: Empaque especial, Cargo por servicio o Propina fija aplicada en checkout.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExtraFeeRulesDraft((prev) => [
                          ...prev,
                          {
                            id: `fee_${Date.now()}`,
                            label: "",
                            amountUsd: "0.00",
                            enabled: true,
                          },
                        ])
                      }
                      className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      + Añadir cargo fijo
                    </button>
                  </div>
                  {extraFeeRulesDraft.length === 0 ? (
                    <p className="text-[11px] text-stone-500">
                      No hay cargos automáticos configurados.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {extraFeeRulesDraft.map((rule, idx) => (
                        <div key={rule.id} className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 text-xs text-stone-700">
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={(e) =>
                                setExtraFeeRulesDraft((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, enabled: e.target.checked } : item,
                                  ),
                                )
                              }
                              className="accent-(--brand)"
                            />
                            Activo
                          </label>
                          <input
                            type="text"
                            value={rule.label}
                            onChange={(e) =>
                              setExtraFeeRulesDraft((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, label: e.target.value } : item,
                                ),
                              )
                            }
                            placeholder="Ej. Empaque regalo"
                            className="min-w-40 flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs"
                          />
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rule.amountUsd}
                            onChange={(e) =>
                              setExtraFeeRulesDraft((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, amountUsd: e.target.value } : item,
                                ),
                              )
                            }
                            placeholder="0.00"
                            className="w-24 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setExtraFeeRulesDraft((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="cursor-pointer rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-500 hover:text-red-600"
                            aria-label="Eliminar cargo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Moneda de la tienda
                    </span>
                    <select
                      value={storeCurrency}
                      onChange={(e) => setStoreCurrency(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="USD">USD — Dólar estadounidense</option>
                      <option value="MXN">MXN — Peso mexicano</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="COP">COP — Peso colombiano</option>
                      <option value="CAD">CAD — Dólar canadiense</option>
                      <option value="CUP">CUP — Peso cubano</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Pasarela de pago con tarjeta
                    </span>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as PaymentProvider)}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="TROPIPAY">TropiPay (Tarjeta / Saldo TropiPay)</option>
                      <option value="NONE">Ninguna (Solo coordinación)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Prefijo de folio (ej. DEL-1001)
                    </span>
                    <input
                      type="text"
                      value={orderPrefix}
                      onChange={(e) => setOrderPrefix(e.target.value)}
                      maxLength={6}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm uppercase"
                    />
                  </label>
                </div>

                <div>
                  <span className="mb-1.5 block text-xs font-medium text-stone-600">
                    Métodos de pago ofrecidos en el formulario
                  </span>
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={methods.includes("CARD_LINK")}
                        onChange={() => toggleMethod("CARD_LINK")}
                        className="accent-(--brand)"
                      />
                      Tarjeta / Link de pago (TropiPay)
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={methods.includes("WHATSAPP_COORDINATION")}
                        onChange={() => toggleMethod("WHATSAPP_COORDINATION")}
                        className="accent-(--brand)"
                      />
                      Coordinar por WhatsApp
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="cursor-pointer rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
                >
                  Guardar ajustes de pedidos, carrito y pagos
                </button>
              </form>

              <hr className="border-stone-200" />

              <form onSubmit={handleSaveCredentials} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-stone-800">
                    Credenciales de TropiPay específicas de {storeName}
                  </p>
                  {paymentSettings.tropiPayClientIdHint && (
                    <span className="text-xs text-stone-500">
                      Actual: <code>{paymentSettings.tropiPayClientIdHint}</code> (
                      {paymentSettings.tropiPaySource === "database"
                        ? "Configuración de la tienda"
                        : ".env / Vercel"}
                      )
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Client ID
                    </span>
                    <input
                      type="text"
                      value={tropiClientId}
                      onChange={(e) => setTropiClientId(e.target.value)}
                      placeholder="Client ID de TropiPay"
                      autoComplete="off"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Client Secret
                    </span>
                    <input
                      type="password"
                      value={tropiClientSecret}
                      onChange={(e) => setTropiClientSecret(e.target.value)}
                      placeholder="Client Secret de TropiPay"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Entorno
                    </span>
                    <select
                      value={tropiEnv}
                      onChange={(e) => setTropiEnv(e.target.value as TropiPayEnv)}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="sandbox">Sandbox (Pruebas)</option>
                      <option value="production">Producción (Pagos reales)</option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="cursor-pointer rounded-xl bg-(--brand) px-4 py-2 text-xs font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                  >
                    Guardar credenciales de TropiPay
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleTestConnection}
                    className="cursor-pointer rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:bg-stone-50 disabled:opacity-50"
                  >
                    Probar conexión con TropiPay
                  </button>
                </div>
              </form>

              {settingsFeedback && (
                <p
                  role="status"
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${
                    settingsFeedback.type === "ok"
                      ? "bg-emerald-50 text-emerald-900"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {settingsFeedback.text}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
