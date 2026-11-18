"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useCart } from "@/components/catalog/CartContext";
import { BRAND } from "@/config/brand";
import {
  MAX_CART_LINE_QTY,
  computeCheckoutFees,
  getBusinessPresetCopy,
} from "@/lib/catalog/cart";
import {
  EMPTY_QUICK_ORDER,
  MAX_LENGTH,
  TIME_SLOTS,
  buildCartCheckoutPayload,
  buildCartWhatsAppUrl,
  collectCartOrderFormErrors,
  defaultZone,
  havanaToday,
  paymentOptions,
  savesOrders,
  type QuickOrderForm,
  type RequiredOrderField,
} from "@/lib/catalog/checkout";
import {
  formatCents,
  type CreateCheckoutOrderResponse,
  type DeliveryZone,
} from "@/types/catalog";

interface OrderCartDrawerProps {
  zones: DeliveryZone[];
}

interface MissingFieldError {
  field: RequiredOrderField;
  label: string;
  message: string;
}

const FIELD_ERROR_LABELS: Record<RequiredOrderField, { label: string; message: string }> = {
  buyerName: {
    label: "Tu nombre",
    message: "Indica tu nombre para registrar tu pedido.",
  },
  buyerPhone: {
    label: "Tu WhatsApp / Teléfono",
    message: "Indica un número de contacto para confirmar tu pedido.",
  },
  recipientName: {
    label: "Nombre de quien recibe",
    message: "Indica el nombre de la persona que recibirá el pastel.",
  },
  recipientPhone: {
    label: "Teléfono de quien recibe",
    message: "Indica el teléfono de quien recibe.",
  },
  zoneId: {
    label: "Zona en Mérida",
    message: "Selecciona la zona de entrega en Mérida.",
  },
  address: {
    label: "Dirección en Mérida",
    message: "Escribe la dirección o colonia de entrega en Mérida.",
  },
  date: {
    label: "Fecha deseada",
    message: "Selecciona la fecha de entrega (pasteles completos mín. 2 días antes).",
  },
};

type CartSubmitState =
  | { kind: "idle" }
  | { kind: "sending"; intent: "quote" | "pay" }
  | {
      kind: "done";
      intent: "quote" | "pay";
      order?: CreateCheckoutOrderResponse;
      whatsappUrl: string;
      paymentLinkUrl?: string | null;
      warning?: string | null;
    }
  | { kind: "error"; message: string };

const WhatsAppIcon = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a9.9 9.9 0 0 0-8.51 15L2 22l5.15-1.44A9.94 9.94 0 1 0 12 2Zm5.8 14.13c-.24.68-1.4 1.3-1.93 1.35-.52.05-1 .24-3.38-.7-2.86-1.13-4.66-4.06-4.8-4.25-.14-.19-1.14-1.52-1.14-2.9 0-1.38.72-2.06 1-2.34.24-.26.53-.32.7-.32h.5c.17 0 .38-.03.6.46.23.5.76 1.86.83 2 .07.13.11.29.02.48-.08.19-.13.3-.25.47l-.38.44c-.12.13-.26.27-.11.52.14.25.63 1.04 1.36 1.69.93.83 1.72 1.09 1.97 1.21.24.13.39.11.53-.06.14-.17.62-.72.78-.97.16-.25.32-.2.55-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.6-.17 1.28Z" />
  </svg>
);

const CardIcon = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const fieldClass =
  "block w-full rounded-[var(--r-sm)] border border-[var(--line-2)] bg-white px-3.5 py-2.5 text-[14.5px] leading-snug text-[var(--ink)] placeholder:text-[var(--ink-4)] transition-colors focus:border-[var(--rose)] focus:outline-none";
const labelClass =
  "mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-3)]";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function OrderCartDrawer({ zones }: OrderCartDrawerProps) {
  const {
    store,
    checkoutConfig,
    items,
    itemCount,
    subtotalCents,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
    showPrices,
    setShowPrices,
    isPriceVisibleFor,
    stripeEnabled,
  } = useCart();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const currency = store.currency || BRAND.currency;
  const fallbackZone = useMemo(() => defaultZone(store, zones), [store, zones]);
  const copy = useMemo(
    () => getBusinessPresetCopy(checkoutConfig.business_preset),
    [checkoutConfig.business_preset],
  );
  const payments = useMemo(() => paymentOptions(store), [store]);

  const [form, setForm] = useState<QuickOrderForm>(() => ({
    ...EMPTY_QUICK_ORDER,
    date: havanaToday(),
    payment: payments[0]?.value ?? EMPTY_QUICK_ORDER.payment,
    zoneId:
      checkoutConfig.shipping_fee_mode === "ZONE_SELECTOR"
        ? ""
        : (fallbackZone?.id ?? ""),
  }));
  const [otherRecipient, setOtherRecipient] = useState(copy.recipientRequired);
  const [submit, setSubmit] = useState<CartSubmitState>({ kind: "idle" });
  const [missingModal, setMissingModal] = useState<{
    intent: "quote" | "pay";
    errors: MissingFieldError[];
  } | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<Set<keyof QuickOrderForm>>(
    new Set(),
  );

  // Sync body scroll lock and Escape key with isCartOpen
  useEffect(() => {
    const root = document.documentElement;
    if (!isCartOpen) {
      root.style.overflow = "";
      document.body.style.overflow = "";
      return;
    }

    root.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (missingModal) {
          setMissingModal(null);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      root.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isCartOpen, missingModal]);

  useEffect(() => {
    setOtherRecipient(copy.recipientRequired);
  }, [copy.recipientRequired]);

  useEffect(() => {
    if (checkoutConfig.shipping_fee_mode !== "ZONE_SELECTOR" && !form.zoneId && fallbackZone) {
      setForm((prev) => ({ ...prev, zoneId: fallbackZone.id }));
    }
  }, [checkoutConfig.shipping_fee_mode, fallbackZone, form.zoneId]);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === form.zoneId),
    [zones, form.zoneId],
  );

  const feeSummary = useMemo(
    () =>
      computeCheckoutFees({
        subtotalCents,
        config: checkoutConfig,
        selectedZone,
      }),
    [subtotalCents, checkoutConfig, selectedZone],
  );

  const allItemsShowPrice = useMemo(
    () =>
      items.length > 0 &&
      items.every((item) => isPriceVisibleFor(item.productSlug || item.productId)),
    [items, isPriceVisibleFor],
  );

  const depositCents = Math.round(feeSummary.totalCents / 2);

  const saveOrders = savesOrders(store);
  const showZoneSelect =
    checkoutConfig.shipping_fee_mode === "ZONE_SELECTOR" && zones.length > 0;
  const hasStripeCard =
    saveOrders &&
    (store.payment_provider === "STRIPE" || stripeEnabled) &&
    payments.some((p) => p.value === "CARD_LINK");
  const isAdminQuoteMode = checkoutConfig.shipping_fee_mode === "ADMIN_QUOTE_LATER";
  const canPayImmediately =
    hasStripeCard &&
    (!isAdminQuoteMode || checkoutConfig.allow_immediate_payment_without_shipping);

  const getFieldClass = (key: keyof QuickOrderForm, extra = "") =>
    `${fieldClass} ${
      highlightedFields.has(key)
        ? "border-red-400 bg-red-50/40 ring-2 ring-red-200"
        : ""
    } ${extra}`.trim();

  const focusField = (field: keyof QuickOrderForm) => {
    setMissingModal(null);
    window.requestAnimationFrame(() => {
      const container = bodyScrollRef.current;
      const targetEl = container?.querySelector<HTMLElement>(
        `[data-cart-field="${field}"]`,
      );
      if (container && targetEl) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const nextTop =
          container.scrollTop +
          (targetRect.top - containerRect.top) -
          containerRect.height / 2 +
          targetRect.height / 2;
        container.scrollTo({
          top: Math.max(0, nextTop),
          behavior: "smooth",
        });
        targetEl.focus({ preventScroll: true });
      }
    });
  };

  const setField =
    <K extends keyof QuickOrderForm>(key: K) =>
    (event: { target: { value: string } }) => {
      setForm((current) => ({ ...current, [key]: event.target.value as QuickOrderForm[K] }));
      setHighlightedFields((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setSubmit((prev) => (prev.kind === "error" ? { kind: "idle" } : prev));
    };

  const handleClose = () => {
    setMissingModal(null);
    if (submit.kind === "done") {
      setSubmit({ kind: "idle" });
    }
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    closeCart();
  };

  async function handleOrderAction(intent: "quote" | "pay") {
    if (submit.kind === "sending" || items.length === 0) return;

    // Store with save_orders = false -> pure client-side WhatsApp order
    if (!saveOrders) {
      const whatsappUrl = buildCartWhatsAppUrl({
        store,
        items,
        fees: feeSummary,
        zone: selectedZone,
        form,
        isPriceVisibleFor,
      });
      const win = window.open(whatsappUrl, "_blank");
      if (win) {
        win.opener = null;
      } else {
        window.location.href = whatsappUrl;
      }
      clearCart();
      setSubmit({
        kind: "done",
        intent: "quote",
        whatsappUrl,
      });
      return;
    }

    if (intent === "pay") {
      const { missingFields } = collectCartOrderFormErrors({
        form,
        needZone: showZoneSelect,
        recipientRequired: copy.recipientRequired || otherRecipient,
      });

      if (missingFields.length > 0) {
        const errors: MissingFieldError[] = missingFields.map((f) => ({
          field: f,
          label: FIELD_ERROR_LABELS[f].label,
          message: FIELD_ERROR_LABELS[f].message,
        }));
        setHighlightedFields(new Set(missingFields));
        setMissingModal({ intent, errors });
        return;
      }
    }

    const effectiveForm: QuickOrderForm =
      intent === "pay" ? { ...form, payment: "CARD_LINK" } : form;
    const popup = intent === "quote" ? window.open("", "_blank") : null;

    setSubmit({ kind: "sending", intent });

    try {
      const payload = buildCartCheckoutPayload({
        store,
        items,
        zone: selectedZone ?? fallbackZone,
        form: effectiveForm,
      });

      const res = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          intent,
        }),
      });

      const json = (await res.json()) as {
        order?: CreateCheckoutOrderResponse;
        paymentUrl?: string | null;
        payment_link_url?: string | null;
        warning?: string | null;
        error?: string;
      };

      if (!res.ok || !json.order) {
        throw new Error(json.error ?? "No pudimos registrar tu pedido.");
      }

      const order = json.order;
      const paymentLinkUrl =
        json.paymentUrl ?? json.payment_link_url ?? order.payment_link_url ?? null;

      const whatsappUrl = buildCartWhatsAppUrl({
        order,
        store,
        items,
        fees: feeSummary,
        zone: selectedZone,
        form: effectiveForm,
        isPriceVisibleFor,
      });

      clearCart();

      setSubmit({
        kind: "done",
        intent,
        order,
        whatsappUrl,
        paymentLinkUrl,
        warning: json.warning ?? null,
      });

      if (intent === "quote") {
        if (popup) {
          popup.opener = null;
          popup.location.href = whatsappUrl;
        }
      } else if (paymentLinkUrl) {
        window.setTimeout(() => {
          window.location.href = paymentLinkUrl;
        }, 2200);
      }
    } catch (err) {
      popup?.close();
      setSubmit({
        kind: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "No pudimos registrar tu pedido. Intenta nuevamente.",
      });
    }
  }

  const formLocked = submit.kind === "sending" || submit.kind === "done";

  if (!isCartOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-end justify-end bg-cacao/55 backdrop-blur-[2px] sm:items-stretch"
    >
      <div
        ref={dialogRef as unknown as React.RefObject<HTMLDivElement>}
        className="flex h-[92dvh] min-h-0 w-full flex-col overflow-hidden rounded-t-[var(--r-lg)] bg-blanco-calido text-[var(--ink)] shadow-[var(--sh)] sm:h-dvh sm:w-[min(540px,100vw)] sm:rounded-t-none sm:rounded-l-[var(--r-lg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-crema-rosado px-5 py-3.5 sm:px-7">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--rose)]">
              Conformar Pedido · {store.name}
            </span>
            <h2 id={titleId} className="m-0 text-lg font-bold text-cacao">
              {submit.kind === "done"
                ? "Pedido confirmado"
                : itemCount > 0
                  ? `${itemCount} ${itemCount === 1 ? copy.itemNoun : copy.itemsNoun} en tu pedido`
                  : "Tu pedido está vacío"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar carrito"
              className="-mr-2 grid size-10 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[var(--ink-2)] transition-colors hover:bg-white hover:text-[var(--ink)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          ref={bodyScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pt-5 pb-8 [-webkit-overflow-scrolling:touch] sm:px-7"
        >
          {submit.kind === "done" ? (
            <div aria-live="polite" className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-950">
                <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                  {submit.order ? `Folio #${submit.order.order_code.replace(/^#/, "")}` : "Enviado a WhatsApp"}
                </p>
                <h3 className="mt-1 mb-2 text-xl font-extrabold text-cacao">
                  {submit.paymentLinkUrl
                    ? "¡Pedido registrado! Redirigiendo a Stripe México..."
                    : "¡Solicitud de pedido lista para confirmar!"}
                </h3>
                <p className="m-0 text-sm leading-relaxed text-cacao-suave">
                  {submit.paymentLinkUrl
                    ? "En unos segundos abrirá la pasarela segura de Stripe (MXN). Al terminar, volverás automáticamente al seguimiento de tu pedido."
                    : "Hemos abierto WhatsApp con los pasteles y formatos seleccionados para confirmar disponibilidad, envío en Mérida y el anticipo del 50%."}
                </p>
                {submit.order && allItemsShowPrice && (
                  <p className="mt-3 mb-0 text-base font-extrabold text-cacao">
                    Total pasteles: ${formatCents(submit.order.total_cents)} {currency} · Anticipo 50%: $
                    {formatCents(Math.round(submit.order.total_cents / 2))} {currency}
                  </p>
                )}
              </div>

              {submit.warning && (
                <p className="m-0 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                  {submit.warning}
                </p>
              )}

              {submit.paymentLinkUrl && (
                <a
                  href={submit.paymentLinkUrl}
                  className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--rose)] text-[15px] font-extrabold text-white no-underline shadow-md transition hover:brightness-105"
                >
                  {CardIcon}
                  Pagar en Stripe México
                  {allItemsShowPrice && submit.order
                    ? ` ($${formatCents(submit.order.total_cents)} ${currency})`
                    : ""}
                </a>
              )}

              <a
                href={submit.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[50px] items-center justify-center gap-2 rounded-full bg-whatsapp text-[14.5px] font-extrabold text-white no-underline shadow-sm transition hover:brightness-95"
              >
                {WhatsAppIcon}
                Abrir WhatsApp con mi pedido
              </a>

              {submit.order && (
                <a
                  href={`/pedido/${encodeURIComponent(submit.order.tracking_token ?? submit.order.order_code.replace(/^#/, ""))}`}
                  className="flex h-[46px] items-center justify-center rounded-full border border-[var(--line-2)] bg-white text-[13.5px] font-bold text-cacao no-underline transition hover:bg-crema"
                >
                  Ver seguimiento de mi pedido #{submit.order.order_code.replace(/^#/, "")}
                </a>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="mt-2 h-11 w-full cursor-pointer rounded-full border border-[var(--line-2)] bg-transparent text-sm font-semibold text-cacao-suave hover:text-cacao"
              >
                Seguir viendo el catálogo
              </button>
            </div>
          ) : itemCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-crema-rosado text-rosa-profundo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <p className="m-0 text-base font-bold text-cacao">
                Aún no has agregado pasteles a tu pedido
              </p>
              <p className="mt-1.5 max-w-xs text-sm text-cacao-suave">
                Elige cualquiera de nuestros 3 Medovik en formato Rebanada (~180 g), Mediano (~1,225 kg) o Grande (~2,45 kg).
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-5 cursor-pointer rounded-full bg-rosa px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rosa-oscuro"
              >
                Explorar los 3 sabores
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Items list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--ink-3)]">
                    Pasteles y formatos seleccionados
                  </span>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-cacao-tenue underline hover:text-rosa"
                  >
                    Vaciar pedido
                  </button>
                </div>

                {items.map((item) => {
                  const itemShowsPrice = isPriceVisibleFor(item.productSlug || item.productId);
                  return (
                    <div
                      key={item.key}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-crema/60 p-3"
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="size-16 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-crema-rosado text-lg">
                          🍯
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="m-0 truncate text-sm font-bold text-cacao">
                            {item.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            aria-label={`Quitar ${item.name}`}
                            className="cursor-pointer border-0 bg-transparent p-0 text-xs text-cacao-tenue hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>

                        {item.presentationLabel && (
                          <p className="m-0 mt-0.5 text-xs font-semibold text-rosa-profundo">
                            Formato: {item.presentationLabel}
                          </p>
                        )}

                        {item.note && (
                          <p className="m-0 mt-0.5 truncate text-[11px] italic text-cacao-suave">
                            “{item.note}”
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="inline-flex h-8 items-center rounded-lg border border-[var(--line-2)] bg-white">
                            <button
                              type="button"
                              aria-label="Reducir cantidad"
                              onClick={() => updateQuantity(item.key, item.quantity - 1)}
                              className="h-full w-8 cursor-pointer border-0 bg-transparent text-sm font-bold text-cacao"
                            >
                              -
                            </button>
                            <span className="min-w-[24px] text-center text-xs font-bold text-cacao">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Aumentar cantidad"
                              disabled={item.quantity >= MAX_CART_LINE_QTY}
                              onClick={() => updateQuantity(item.key, item.quantity + 1)}
                              className="h-full w-8 cursor-pointer border-0 bg-transparent text-sm font-bold text-cacao disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>

                          {itemShowsPrice ? (
                            <span className="text-sm font-extrabold text-cacao">
                              ${formatCents(item.unitPriceCents * item.quantity)} {currency}
                            </span>
                          ) : (
                            <span className="rounded-full bg-rosa-empolvado/40 px-2.5 py-0.5 text-[11px] font-bold text-rosa-profundo">
                              Cotizar al confirmar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Zone selector if active */}
              {showZoneSelect && (
                <div className="rounded-2xl border border-[var(--line)] bg-crema-rosado/50 p-4">
                  <Field label="Zona de entrega en Mérida *">
                    <select
                      data-cart-field="zoneId"
                      disabled={formLocked}
                      value={form.zoneId}
                      onChange={setField("zoneId")}
                      className={getFieldClass("zoneId")}
                    >
                      <option value="" disabled>
                        Elige la zona en Mérida
                      </option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                          {z.fee_cents > 0 && allItemsShowPrice
                            ? ` · +$${formatCents(z.fee_cents)} ${currency}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {/* Fee breakdown or Catalog Mode banner */}
              <div className="rounded-2xl border border-[var(--line)] bg-crema/70 p-4 text-sm">
                {allItemsShowPrice ? (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-cacao">Total pasteles</span>
                      <span className="text-xl font-black text-cacao">
                        ${formatCents(feeSummary.totalCents)} {currency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-rosa-profundo">
                      <span>Anticipo 50% para confirmar pedido:</span>
                      <span>
                        ${formatCents(depositCents)} {currency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-cacao-suave">
                      <span>50% restante al momento de la entrega:</span>
                      <span>
                        ${formatCents(feeSummary.totalCents - depositCents)} {currency}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="m-0 text-xs font-bold uppercase tracking-wider text-rosa-profundo">
                        Modo Catálogo Digital (Sin pago en línea)
                      </p>
                      <p className="m-0 mt-0.5 text-xs text-cacao-suave">
                        Te confirmaremos disponibilidad, total e importe del 50% de anticipo directamente por WhatsApp.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPrices(true)}
                      className="shrink-0 rounded-full border border-dorado bg-white px-3 py-1.5 text-xs font-bold text-cacao hover:bg-rosa-empolvado/30 cursor-pointer"
                    >
                      Ver precios
                    </button>
                  </div>
                )}
              </div>

              {/* Delivery & contact form */}
              <fieldset disabled={formLocked} className="m-0 grid min-w-0 gap-5 border-0 p-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <h3 className="m-0 text-[15px] font-bold text-cacao">
                      {copy.buyerSectionTitle}
                    </h3>
                  </div>
                  <Field label={saveOrders ? "Tu nombre *" : "Tu nombre"}>
                    <input
                      data-cart-field="buyerName"
                      value={form.buyerName}
                      onChange={setField("buyerName")}
                      maxLength={MAX_LENGTH.name}
                      autoComplete="name"
                      placeholder="Ej. Sofía Hernández"
                      className={getFieldClass("buyerName")}
                    />
                  </Field>
                  <Field label={saveOrders ? "Tu WhatsApp / Teléfono *" : "Tu WhatsApp / Teléfono"}>
                    <input
                      data-cart-field="buyerPhone"
                      type="tel"
                      value={form.buyerPhone}
                      onChange={setField("buyerPhone")}
                      maxLength={MAX_LENGTH.phone}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="999 000 0000"
                      className={getFieldClass("buyerPhone")}
                    />
                  </Field>
                  <Field
                    label={
                      canPayImmediately
                        ? "Correo electrónico (para recibo Stripe y seguimiento)"
                        : "Correo electrónico (opcional)"
                    }
                    className="sm:col-span-2"
                  >
                    <input
                      data-cart-field="buyerEmail"
                      type="email"
                      value={form.buyerEmail}
                      onChange={setField("buyerEmail")}
                      maxLength={MAX_LENGTH.email}
                      autoComplete="email"
                      inputMode="email"
                      placeholder="tu@correo.com"
                      className={getFieldClass("buyerEmail")}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                    <h3 className="m-0 text-[15px] font-bold text-cacao">
                      {copy.recipientSectionTitle}
                    </h3>
                    {!copy.recipientRequired && (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-cacao-suave">
                        <input
                          type="checkbox"
                          checked={otherRecipient}
                          onChange={(e) => setOtherRecipient(e.target.checked)}
                          className="accent-[var(--rose)]"
                        />
                        Es para regalo / recibe otra persona
                      </label>
                    )}
                  </div>
                  <div className="sm:col-span-2 rounded-xl border border-dorado-suave/70 bg-crema/70 px-3.5 py-2.5 text-xs leading-relaxed text-cacao-suave">
                    <strong className="text-cacao">Guía rápida de pedido en Mérida:</strong>{" "}
                    Pasteles completos con mínimo <strong>2 días de anticipación</strong>{" "}
                    (rebanadas sujetas a disponibilidad). Confirmación con{" "}
                    <strong>50% de anticipo</strong> y 50% al entregar. Envío a domicilio
                    según dirección en Mérida (costo mínimo en ruta compartida).
                  </div>

                  {(copy.recipientRequired || otherRecipient) && (
                    <>
                      <Field label={copy.recipientRequired && saveOrders ? "Nombre de quien recibe *" : "Nombre de quien recibe"}>
                        <input
                          data-cart-field="recipientName"
                          value={form.recipientName}
                          onChange={setField("recipientName")}
                          maxLength={MAX_LENGTH.name}
                          placeholder="Ej. Mamá / Carlos"
                          className={getFieldClass("recipientName")}
                        />
                      </Field>
                      <Field label={copy.recipientRequired && saveOrders ? "Teléfono de quien recibe *" : "Teléfono de quien recibe"}>
                        <input
                          data-cart-field="recipientPhone"
                          type="tel"
                          value={form.recipientPhone}
                          onChange={setField("recipientPhone")}
                          maxLength={MAX_LENGTH.phone}
                          inputMode="tel"
                          placeholder="999 000 0000"
                          className={getFieldClass("recipientPhone")}
                        />
                      </Field>
                    </>
                  )}

                  <Field
                    label={saveOrders ? `${copy.addressLabel} *` : copy.addressLabel}
                    className="sm:col-span-2"
                  >
                    <textarea
                      data-cart-field="address"
                      value={form.address}
                      onChange={setField("address")}
                      rows={2}
                      maxLength={MAX_LENGTH.address}
                      placeholder={copy.addressPlaceholder}
                      className={getFieldClass("address", "resize-y")}
                    />
                  </Field>

                  <Field label={saveOrders ? `${copy.dateLabel} *` : copy.dateLabel}>
                    <input
                      data-cart-field="date"
                      type="date"
                      value={form.date}
                      min={havanaToday()}
                      onChange={setField("date")}
                      className={getFieldClass("date")}
                    />
                  </Field>

                  <Field label={copy.timeSlotLabel}>
                    <select
                      data-cart-field="timeSlot"
                      value={form.timeSlot}
                      onChange={setField("timeSlot")}
                      className={fieldClass}
                    >
                      <option value="">Cualquier horario</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Field label={copy.noteLabel}>
                    <textarea
                      value={form.cardMessage}
                      onChange={setField("cardMessage")}
                      rows={2}
                      maxLength={MAX_LENGTH.cardMessage}
                      placeholder={copy.notePlaceholder}
                      className={`${fieldClass} resize-y`}
                    />
                  </Field>

                  {!canPayImmediately && payments.length > 1 && (
                    <Field label="Método de pago preferido">
                      <select
                        value={form.payment}
                        onChange={setField("payment")}
                        className={fieldClass}
                      >
                        {payments.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
              </fieldset>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {submit.kind !== "done" && items.length > 0 && (
          <div className="border-t border-[var(--line)] bg-crema-rosado px-5 pt-3.5 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-7">
            {submit.kind === "error" && (
              <p role="alert" className="mt-0 mb-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900">
                {submit.message}
              </p>
            )}

            {!saveOrders ? (
              <button
                type="button"
                onClick={() => handleOrderAction("quote")}
                className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-whatsapp text-[15px] font-extrabold text-white shadow-[0_8px_20px_rgba(37,211,102,0.35)] transition hover:brightness-105"
              >
                {WhatsAppIcon}
                {allItemsShowPrice
                  ? `Conformar pedido por WhatsApp · $${formatCents(feeSummary.totalCents)} ${currency}`
                  : "Conformar pedido por WhatsApp"}
              </button>
            ) : canPayImmediately ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={submit.kind === "sending"}
                  onClick={() => handleOrderAction("quote")}
                  className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-whatsapp text-[14.5px] font-extrabold text-white shadow-[0_8px_20px_rgba(37,211,102,0.3)] transition hover:brightness-105 disabled:opacity-60"
                >
                  {WhatsAppIcon}
                  {submit.kind === "sending" && submit.intent === "quote"
                    ? "Registrando pedido..."
                    : allItemsShowPrice
                      ? `Conformar por WhatsApp · $${formatCents(feeSummary.totalCents)} ${currency}`
                      : "Conformar pedido por WhatsApp"}
                </button>

                <button
                  type="button"
                  disabled={submit.kind === "sending"}
                  onClick={() => handleOrderAction("pay")}
                  className="flex h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-[var(--rose)] text-[14.5px] font-extrabold text-white shadow-[0_8px_20px_rgba(181,101,118,0.3)] transition hover:brightness-105 disabled:opacity-60"
                >
                  {CardIcon}
                  {submit.kind === "sending" && submit.intent === "pay"
                    ? "Redirigiendo a Stripe México..."
                    : allItemsShowPrice
                      ? `Pagar con Stripe · $${formatCents(feeSummary.totalCents)} ${currency}`
                      : "Pagar con Stripe México (MXN)"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={submit.kind === "sending"}
                onClick={() => handleOrderAction("quote")}
                className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-whatsapp text-[15px] font-extrabold text-white shadow-[0_8px_20px_rgba(37,211,102,0.35)] transition hover:brightness-105 disabled:opacity-60"
              >
                {WhatsAppIcon}
                {submit.kind === "sending"
                  ? "Registrando tu pedido..."
                  : allItemsShowPrice
                    ? `Conformar pedido por WhatsApp · $${formatCents(feeSummary.totalCents)} ${currency}`
                    : "Conformar pedido por WhatsApp"}
              </button>
            )}
          </div>
        )}

        {/* Ventana flotante cuando faltan datos obligatorios */}
        {missingModal && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="missing-fields-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setMissingModal(null);
              }
            }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(61,35,20,0.52)] p-4 backdrop-blur-[2px]"
          >
            <div className="animate-order-slide-up w-full max-w-sm rounded-3xl border border-arena bg-white p-5 shadow-[0_20px_48px_rgba(61,35,20,0.28)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rosa-palido text-base font-extrabold text-rosa">
                    !
                  </span>
                  <div>
                    <h3
                      id="missing-fields-title"
                      className="m-0 text-base font-extrabold text-cacao"
                    >
                      Faltan datos del pedido
                    </h3>
                    <p className="m-0 text-xs text-cacao-suave">
                      {missingModal.intent === "pay"
                        ? "Completa estos campos para ir al pago:"
                        : "Completa estos campos para enviar tu pedido:"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMissingModal(null)}
                  aria-label="Cerrar aviso"
                  className="grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-crema text-cacao-suave hover:bg-arena/60 hover:text-cacao"
                >
                  ✕
                </button>
              </div>

              <ul className="my-4 max-h-[45vh] space-y-2 overflow-y-auto pl-0 list-none">
                {missingModal.errors.map((err) => (
                  <li key={err.field}>
                    <button
                      type="button"
                      onClick={() => focusField(err.field)}
                      className="flex w-full cursor-pointer items-start justify-between gap-2 rounded-xl border border-red-200/80 bg-red-50/60 px-3.5 py-2.5 text-left transition hover:border-rosa hover:bg-rosa-palido/50"
                    >
                      <div>
                        <span className="block text-xs font-extrabold text-cacao">
                          {err.label}
                        </span>
                        <span className="block text-[11.5px] leading-snug text-cacao-suave">
                          {err.message}
                        </span>
                      </div>
                      <span className="mt-0.5 text-xs font-bold text-rosa">Ir →</span>
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() =>
                  missingModal.errors[0]
                    ? focusField(missingModal.errors[0].field)
                    : setMissingModal(null)
                }
                className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--rose)] text-sm font-extrabold text-white shadow-sm transition hover:brightness-105"
              >
                Completar datos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
