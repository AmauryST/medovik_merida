"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useOptionalCart } from "@/components/catalog/CartContext";
import { SlotImage } from "@/components/SlotImage";
import { catalogBridgeHref } from "@/components/catalog/ProductCard";
import { BRAND } from "@/config/brand";
import { parseStoreCheckoutConfig } from "@/lib/catalog/cart";
import {
  EMPTY_QUICK_ORDER,
  MAX_LENGTH,
  TIME_SLOTS,
  buildCheckoutPayload,
  buildOrderWhatsAppUrl,
  defaultZone,
  estimateTotalCents,
  havanaToday,
  paymentOptions,
  savesOrders,
  showsDeliveryZone,
  validateRequiredOrderForm,
  type QuickOrderForm,
} from "@/lib/catalog/checkout";
import {
  formatCents,
  type CatalogProduct,
  type CreateCheckoutOrderResponse,
  type DeliveryZone,
  type MediaSlotItem,
  type ProductSlotCode,
  type StorePublic,
} from "@/types/catalog";

interface ProductDrawerProps {
  product: CatalogProduct;
  store: StorePublic;
  zones: DeliveryZone[];
  onClose: () => void;
}

interface Shot {
  slot: ProductSlotCode;
  index: number;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | {
      kind: "done";
      order: CreateCheckoutOrderResponse;
      url: string;
      paymentLinkUrl?: string | null;
      warning?: string | null;
    }
  | { kind: "error"; message: string };

const MAX_QUANTITY = 10;

const WhatsAppIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a9.9 9.9 0 0 0-8.51 15L2 22l5.15-1.44A9.94 9.94 0 1 0 12 2Zm5.8 14.13c-.24.68-1.4 1.3-1.93 1.35-.52.05-1 .24-3.38-.7-2.86-1.13-4.66-4.06-4.8-4.25-.14-.19-1.14-1.52-1.14-2.9 0-1.38.72-2.06 1-2.34.24-.26.53-.32.7-.32h.5c.17 0 .38-.03.6.46.23.5.76 1.86.83 2 .07.13.11.29.02.48-.08.19-.13.3-.25.47l-.38.44c-.12.13-.26.27-.11.52.14.25.63 1.04 1.36 1.69.93.83 1.72 1.09 1.97 1.21.24.13.39.11.53-.06.14-.17.62-.72.78-.97.16-.25.32-.2.55-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.6-.17 1.28Z" />
  </svg>
);

const CardIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const fieldClass =
  "block w-full rounded-[var(--r-sm)] border border-[var(--line-2)] bg-white px-3.5 py-3 text-[15px] leading-snug text-[var(--ink)] placeholder:text-[var(--ink-4)] transition-colors focus:border-[var(--rose)] focus:outline-none";
const labelClass =
  "mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-3)]";
const pillClass =
  "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border bg-white py-1.5 pr-4 pl-1.5 text-[13px] leading-tight text-[var(--ink)] transition-colors duration-200";

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 grid min-w-0 grid-cols-1 gap-3 border-0 p-0 sm:grid-cols-2">
      <legend className="mb-3 p-0 font-bold text-[17px] text-[var(--ink)]">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function galleryShots(product: CatalogProduct): Shot[] {
  const primary = Math.max(product.media_by_slot.PRODUCT_PRIMARY?.length ?? 0, 1);
  const gallery = product.media_by_slot.PRODUCT_GALLERY?.length ?? 0;
  return [
    ...Array.from({ length: primary }, (_, index) => ({ slot: "PRODUCT_PRIMARY" as const, index })),
    ...Array.from({ length: gallery }, (_, index) => ({ slot: "PRODUCT_GALLERY" as const, index })),
  ];
}

const sameShot = (a: Shot, b: Shot) => a.slot === b.slot && a.index === b.index;

export function ProductDrawer({ product, store, zones, onClose }: ProductDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const cart = useOptionalCart();
  const currency = store.currency || BRAND.currency;
  const checkoutConfig = useMemo(
    () => cart?.checkoutConfig ?? parseStoreCheckoutConfig(store),
    [cart?.checkoutConfig, store],
  );

  const shots = useMemo(() => galleryShots(product), [product]);
  const presentations = product.media_by_slot.PRODUCT_PRESENTATION ?? [];
  const guides = product.media_by_slot.PRODUCT_INFO_GUIDE ?? [];
  const reviews = product.media_by_slot.PRODUCT_REVIEW_PROOF ?? [];

  const [active, setActive] = useState<Shot>(shots[0] ?? { slot: "PRODUCT_PRIMARY", index: 0 });
  const [presentationIndex, setPresentationIndex] = useState<number | null>(
    presentations.length >= 2 ? 1 : presentations.length > 0 ? 0 : null,
  );
  const [quantity, setQuantity] = useState(1);
  const [itemNote, setItemNote] = useState("");
  const [form, setForm] = useState<QuickOrderForm>(() => ({
    ...EMPTY_QUICK_ORDER,
    payment: paymentOptions(store)[0]?.value ?? EMPTY_QUICK_ORDER.payment,
    zoneId: showsDeliveryZone(store, zones) ? "" : (defaultZone(store, zones)?.id ?? ""),
  }));
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  const presentation: MediaSlotItem | undefined =
    presentationIndex === null ? undefined : (presentations[presentationIndex] ?? undefined);
  const zone = zones.find((z) => z.id === form.zoneId);
  const unitCents = Math.max(0, product.price_cents + (presentation?.price_delta_cents ?? 0));
  const lineSubtotalCents = unitCents * quantity;
  const saveOrders = savesOrders(store);
  const showZone = showsDeliveryZone(store, zones);
  const payments = paymentOptions(store);
  const estimateCents = estimateTotalCents(product, presentation, quantity, showZone ? zone : undefined);
  const showPrice = true;
  const isStripeCardCheckout =
    saveOrders &&
    (store.payment_provider === "STRIPE" || cart?.stripeEnabled) &&
    form.payment === "CARD_LINK";
  const canAddToCart = Boolean(cart) && checkoutConfig.order_mode !== "SINGLE_PRODUCT";

  const handleAddToCart = () => {
    if (!cart) return;
    cart.addItem({
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      imageUrl: presentation?.url ?? product.primary_image_url ?? null,
      presentationId: presentation?.placement_id ?? null,
      presentationLabel: presentation?.label ?? null,
      unitPriceCents: unitCents,
      quantity,
      note: itemNote.trim() || undefined,
    });
    close();
  };

  const close = () => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    onClose();
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (!document.querySelector("dialog[open]")) {
        root.style.overflow = "";
        document.body.style.overflow = "";
      }
    };
  }, []);

  const set =
    <K extends keyof QuickOrderForm>(key: K) =>
    (event: { target: { value: string } }) => {
      setForm((current) => ({ ...current, [key]: event.target.value as QuickOrderForm[K] }));
      setSubmit((prev) => (prev.kind === "error" ? { kind: "idle" } : prev));
    };

  const choosePresentation = (index: number | null) => {
    setPresentationIndex(index);
    setActive(index === null ? (shots[0] ?? active) : { slot: "PRODUCT_PRESENTATION", index });
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submit.kind === "sending") return;

    if (!saveOrders) {
      const url = buildOrderWhatsAppUrl({
        store,
        product,
        presentation,
        quantity,
        zone,
        form,
        showPrice,
      });
      const win = window.open(url, "_blank");
      if (win) {
        win.opener = null;
      } else {
        window.location.href = url;
      }
      return;
    }

    if (isStripeCardCheckout) {
      const validationMsg = validateRequiredOrderForm(form, showZone);
      if (validationMsg) {
        setSubmit({ kind: "error", message: validationMsg });
        return;
      }
    }

    const popup = isStripeCardCheckout ? null : window.open("", "_blank");
    setSubmit({ kind: "sending" });
    try {
      const payload = buildCheckoutPayload({
        store,
        product,
        presentation,
        quantity,
        zone,
        form,
      });

      const res = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          intent: isStripeCardCheckout ? "pay" : "quote",
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
        throw new Error(json.error ?? "No pudimos crear el pedido.");
      }
      const order = json.order;
      const paymentLinkUrl =
        json.paymentUrl ?? json.payment_link_url ?? order.payment_link_url ?? null;
      const whatsappUrl = buildOrderWhatsAppUrl({
        order,
        store,
        product,
        presentation,
        quantity,
        zone,
        form,
        showPrice,
      });
      setSubmit({
        kind: "done",
        order,
        url: whatsappUrl,
        paymentLinkUrl,
        warning: json.warning ?? null,
      });

      if (isStripeCardCheckout) {
        if (paymentLinkUrl) {
          window.setTimeout(() => {
            window.location.href = paymentLinkUrl;
          }, 2600);
        }
        return;
      }

      if (popup) {
        popup.opener = null;
        popup.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }
    } catch (err) {
      popup?.close();
      console.error("create_checkout_order", err);
      setSubmit({
        kind: "error",
        message: err instanceof Error && err.message ? err.message : "No pudimos crear el pedido.",
      });
    }
  }

  const tagline = product.short_description ?? product.description;
  const extrasLabel = [guides.length > 0 && "Detalles y porciones", reviews.length > 0 && "Opiniones"]
    .filter(Boolean)
    .join(" / ");
  const formLocked = submit.kind === "sending" || submit.kind === "done";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-end bg-cacao/55 backdrop-blur-[2px] sm:items-stretch"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef as unknown as React.RefObject<HTMLDivElement>}
        className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-[var(--r-lg)] bg-blanco-calido text-[var(--ink)] shadow-[var(--sh)] sm:h-dvh sm:w-[min(520px,100vw)] sm:rounded-t-none sm:rounded-l-[var(--r-lg)]"
      >
      <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3.5 sm:px-7 bg-crema-rosado">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--rose)]">
            Tu pedido · {store.name}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="-mr-2 grid size-10 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[var(--ink-2)] transition-colors hover:bg-white hover:text-[var(--ink)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-8 sm:px-7">
          {/* Gallery */}
          <SlotImage
            key={`${active.slot}:${active.index}`}
            product={product}
            slot={active.slot}
            index={active.index}
            className="aspect-[4/3] w-full rounded-[var(--r)] object-cover shadow-sm"
            sizes="(min-width: 640px) 472px, 92vw"
            priority
          />
          {shots.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Fotos del pastel">
              {shots.map((shot, i) => (
                <button
                  key={`${shot.slot}:${shot.index}`}
                  type="button"
                  onClick={() => setActive(shot)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-pressed={sameShot(shot, active)}
                  className={`shrink-0 cursor-pointer overflow-hidden rounded-[10px] border-2 bg-transparent p-0 transition-colors ${
                    sameShot(shot, active) ? "border-[var(--rose)]" : "border-transparent hover:border-[var(--line-2)]"
                  }`}
                >
                  <SlotImage product={product} slot={shot.slot} index={shot.index} className="aspect-square w-16" sizes="64px" alt="" />
                </button>
              ))}
            </div>
          )}

          {/* Name and rich description */}
          <div className="mt-5 flex flex-wrap items-start justify-between gap-2">
            <h2 id={titleId} className="m-0 text-[26px] font-bold text-cacao leading-tight">
              {product.name}
            </h2>
          </div>
          {tagline && <p className="mt-1.5 mb-0 text-[15px] text-cacao-suave leading-relaxed">{tagline}</p>}

          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="text-[26px] font-extrabold text-[var(--rose)]">
              ${formatCents(unitCents)} {currency}
            </span>
            <span className="rounded-full bg-rosa-empolvado/50 px-2.5 py-0.5 text-xs font-bold text-rosa-profundo">
              Anticipo 50%: ${formatCents(Math.round(unitCents / 2))} {currency}
            </span>
          </div>

          {/* Ficha Técnica y Sensorial del Pastel */}
          <div className="mt-5 space-y-2.5 rounded-2xl border border-dorado-suave/70 bg-crema/60 p-4 text-xs leading-relaxed text-cacao-suave">
            {typeof product.attributes?.layers_info === "string" && (
              <p className="m-0">
                <strong className="text-cacao">Capas y estructura:</strong>{" "}
                {product.attributes.layers_info}
              </p>
            )}
            {typeof product.attributes?.intensity === "string" && (
              <p className="m-0">
                <strong className="text-cacao">Perfil sensorial:</strong>{" "}
                {product.attributes.intensity}
              </p>
            )}
            {Array.isArray(product.attributes?.ingredients) && (
              <div>
                <strong className="text-cacao">Ingredientes reales (0% conservadores):</strong>
                <ul className="mt-1 mb-0 list-disc space-y-0.5 pl-4">
                  {(product.attributes.ingredients as string[]).map((ing) => (
                    <li key={ing}>{ing}</li>
                  ))}
                </ul>
              </div>
            )}
            {typeof product.attributes?.pairing === "string" && (
              <p className="m-0">
                <strong className="text-cacao">Maridaje sugerido:</strong>{" "}
                {product.attributes.pairing}
              </p>
            )}
            {typeof product.attributes?.conservation === "string" && (
              <p className="m-0">
                <strong className="text-cacao">Conservación:</strong>{" "}
                {product.attributes.conservation}
              </p>
            )}
          </div>

          {/* Presentations / Los 3 Formatos */}
          {presentations.length > 0 && (
            <div className="mt-6">
              <span className={labelClass}>Elige el Formato (Rebanada, Mediano o Grande)</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Formato del pastel">
                {presentations.map((item, index) => {
                  const fmtPriceCents = Math.max(0, product.price_cents + item.price_delta_cents);
                  return (
                    <button
                      key={item.placement_id}
                      type="button"
                      aria-pressed={presentationIndex === index}
                      onClick={() => choosePresentation(index)}
                      className={`${pillClass} ${
                        presentationIndex === index
                          ? "border-[var(--rose)] bg-[var(--rose-soft)] text-[var(--rose-ink)] font-bold"
                          : "border-[var(--line-2)] hover:border-[var(--ink)]"
                      }`}
                    >
                      <SlotImage
                        product={product}
                        slot="PRODUCT_PRESENTATION"
                        index={index}
                        className="aspect-square w-8 rounded-full"
                        sizes="32px"
                        alt=""
                      />
                      <span>
                        {item.label ?? `Formato ${index + 1}`}
                        {showPrice && (
                          <span className="ml-1.5 font-extrabold text-[var(--rose)]">
                            · ${formatCents(fmtPriceCents)} {currency}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {presentation?.caption && (
                <p className="mt-2 mb-0 text-xs font-medium text-cacao-suave">
                  {presentation.caption}
                </p>
              )}
            </div>
          )}

          {/* Care / info */}
          {extrasLabel && (
            <details className="group mt-6 rounded-[var(--r-sm)] border border-[var(--line)]">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-[13px] font-bold uppercase tracking-[0.18em] [&::-webkit-details-marker]:hidden">
                {extrasLabel}
                <span aria-hidden="true" className="text-[18px] text-[var(--ink-3)] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                {(
                  [
                    ["PRODUCT_INFO_GUIDE", guides],
                    ["PRODUCT_REVIEW_PROOF", reviews],
                  ] as const
                ).flatMap(([slot, items]) =>
                  items.map((item, index) => (
                    <figure key={item.placement_id} className="m-0">
                      <SlotImage product={product} slot={slot} index={index} className="aspect-square w-full rounded-[10px]" sizes="220px" />
                      {(item.caption ?? item.label) && (
                        <figcaption className="mt-1.5 text-[13px] leading-snug text-[var(--ink-2)]">
                          {item.caption ?? item.label}
                        </figcaption>
                      )}
                    </figure>
                  )),
                )}
              </div>
            </details>
          )}

          {/* Cart quick-add controls when CART or HYBRID mode is active */}
          {canAddToCart && (
            <div className="mt-6 rounded-2xl border border-[var(--line)] bg-crema/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className={labelClass}>Cantidad</span>
                  <div className="flex h-[44px] items-center rounded-[var(--r-sm)] border border-[var(--line-2)] bg-white">
                    <button
                      type="button"
                      aria-label="Quitar uno"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => q - 1)}
                      className="h-full w-10 cursor-pointer border-0 bg-transparent text-[18px] font-bold text-[var(--ink)] disabled:cursor-default disabled:opacity-30"
                    >
                      -
                    </button>
                    <output aria-live="polite" className="w-8 text-center text-[16px] font-bold">
                      {quantity}
                    </output>
                    <button
                      type="button"
                      aria-label="Añadir uno"
                      disabled={quantity >= MAX_QUANTITY}
                      onClick={() => setQuantity((q) => q + 1)}
                      className="h-full w-10 cursor-pointer border-0 bg-transparent text-[18px] font-bold text-[var(--ink)] disabled:cursor-default disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <span className={labelClass}>
                    {showPrice ? "Subtotal producto" : "Formato seleccionado"}
                  </span>
                  <span className="text-xl font-black text-cacao">
                    {showPrice
                      ? `$${formatCents(lineSubtotalCents)} ${currency}`
                      : (presentation?.label ?? "Por cotizar")}
                  </span>
                </div>
              </div>

              <Field label="Nota o dedicatoria para este pastel (opcional)">
                <input
                  type="text"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  maxLength={140}
                  placeholder="Ej. ¡Feliz cumpleaños! / Indicar horario o alergias..."
                  className={fieldClass}
                />
              </Field>
            </div>
          )}

          {/* Quick order form (shown only in SINGLE_PRODUCT mode) */}
          {!canAddToCart && (
          <div className="mt-8 border-t border-[var(--line)] pt-6">
            <p className="m-0 text-[14px] text-cacao-suave leading-relaxed">
              {saveOrders
                ? "Completa tus datos de contacto y entrega en Mérida (marcados con *) para registrar tu pedido."
                : "Selecciona tu formato favorito y te atendemos personalmente por WhatsApp."}
            </p>

            <fieldset disabled={submit.kind === "sending"} className="mt-5 grid gap-6 border-0 p-0">
              <Group title="Cantidad y zona">
                <Field label="Cantidad">
                  <div className="flex h-[48px] items-center rounded-[var(--r-sm)] border border-[var(--line-2)] bg-white">
                    <button
                      type="button"
                      aria-label="Quitar uno"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => q - 1)}
                      className="h-full w-12 cursor-pointer border-0 bg-transparent text-[20px] font-bold text-[var(--ink)] disabled:cursor-default disabled:opacity-30"
                    >
                      -
                    </button>
                    <output aria-live="polite" className="flex-1 text-center text-[17px] font-bold">
                      {quantity}
                    </output>
                    <button
                      type="button"
                      aria-label="Añadir uno"
                      disabled={quantity >= MAX_QUANTITY}
                      onClick={() => setQuantity((q) => q + 1)}
                      className="h-full w-12 cursor-pointer border-0 bg-transparent text-[20px] font-bold text-[var(--ink)] disabled:cursor-default disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </Field>

                {showZone && (
                  <Field label={saveOrders ? "Zona en Mérida *" : "Zona en Mérida"}>
                    <select
                      data-field="zoneId"
                      required={saveOrders}
                      value={form.zoneId}
                      onChange={set("zoneId")}
                      className={fieldClass}
                    >
                      <option value="">Selecciona colonia / zona</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                          {z.fee_cents > 0 && showPrice ? ` - $${formatCents(z.fee_cents)}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </Group>

              <Group title="Tus datos de contacto">
                <Field label={saveOrders ? "Tu nombre *" : "Tu nombre"}>
                  <input
                    data-field="buyerName"
                    required={saveOrders}
                    value={form.buyerName}
                    onChange={set("buyerName")}
                    maxLength={MAX_LENGTH.name}
                    autoComplete="name"
                    placeholder="Ej. Sofía Hernández"
                    className={fieldClass}
                  />
                </Field>
                <Field label={saveOrders ? "Tu teléfono / WhatsApp *" : "Tu teléfono / WhatsApp"}>
                  <input
                    data-field="buyerPhone"
                    required={saveOrders}
                    type="tel"
                    value={form.buyerPhone}
                    onChange={set("buyerPhone")}
                    maxLength={MAX_LENGTH.phone}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="999 000 0000"
                    className={fieldClass}
                  />
                </Field>
                <Field
                  label={
                    isStripeCardCheckout
                      ? "Tu correo electrónico (para recibo Stripe y seguimiento) *"
                      : "Tu correo electrónico (opcional)"
                  }
                  className="sm:col-span-2"
                >
                  <input
                    data-field="buyerEmail"
                    required={isStripeCardCheckout}
                    type="email"
                    value={form.buyerEmail}
                    onChange={set("buyerEmail")}
                    maxLength={MAX_LENGTH.email}
                    autoComplete="email"
                    inputMode="email"
                    placeholder="tu@correo.com"
                    className={fieldClass}
                  />
                </Field>
              </Group>

              <Group title="Entrega o recolección en Mérida">
                <Field label="Nombre de quien recibe (si es regalo)">
                  <input
                    data-field="recipientName"
                    value={form.recipientName}
                    onChange={set("recipientName")}
                    maxLength={MAX_LENGTH.name}
                    autoComplete="off"
                    placeholder="Opcional si recibes tú mismo(a)"
                    className={fieldClass}
                  />
                </Field>
                <Field label="Teléfono de quien recibe (si es regalo)">
                  <input
                    data-field="recipientPhone"
                    type="tel"
                    value={form.recipientPhone}
                    onChange={set("recipientPhone")}
                    maxLength={MAX_LENGTH.phone}
                    autoComplete="off"
                    inputMode="tel"
                    placeholder="999 000 0000"
                    className={fieldClass}
                  />
                </Field>
                <Field label={saveOrders ? "Dirección en Mérida o punto acordado *" : "Dirección en Mérida o punto acordado"} className="sm:col-span-2">
                  <textarea
                    data-field="address"
                    required={saveOrders}
                    value={form.address}
                    onChange={set("address")}
                    rows={2}
                    maxLength={MAX_LENGTH.address}
                    placeholder="Calle, número, cruzamientos y colonia/fraccionamiento en Mérida..."
                    className={`${fieldClass} resize-y`}
                  />
                </Field>
                <Field label={saveOrders ? "Fecha deseada *" : "Fecha deseada"}>
                  <input
                    data-field="date"
                    required={saveOrders}
                    type="date"
                    value={form.date}
                    min={havanaToday()}
                    onChange={set("date")}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Horario preferido">
                  <select data-field="timeSlot" value={form.timeSlot} onChange={set("timeSlot")} className={fieldClass}>
                    <option value="">Cualquier horario</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </Field>
              </Group>

              <Group title="Personalización del Pastel">
                <Field label="Dedicatoria o mensaje en el pastel" className="sm:col-span-2">
                  <textarea value={form.cardMessage} onChange={set("cardMessage")} rows={2} maxLength={MAX_LENGTH.cardMessage} placeholder="Ej. ¡Feliz Cumpleaños María! (decoración en crema o dedicatoria)" className={`${fieldClass} resize-y`} />
                </Field>
                <div className="sm:col-span-2 rounded-xl border border-dorado-suave/70 bg-crema/70 px-3.5 py-2.5 text-xs leading-relaxed text-cacao-suave">
                  <strong className="text-cacao">Condiciones de pedido en Mérida:</strong>{" "}
                  Pasteles completos con al menos <strong>2 días de anticipación</strong>{" "}
                  (rebanadas sujetas a disponibilidad). Se confirma con{" "}
                  <strong>50% de anticipo</strong> y el otro 50% al momento de la entrega.
                  El costo de envío se informa al confirmar tu dirección (mínimo si coincide con ruta cercana).
                </div>
                {payments.length > 1 && (
                  <Field label="Método de pago preferido" className="sm:col-span-2">
                    <select value={form.payment} onChange={set("payment")} className={fieldClass}>
                      {payments.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </Group>
            </fieldset>
          </div>
          )}
        </div>

        {/* Footer: total + submit / add to cart */}
        <div className="border-t border-[var(--line)] bg-crema-rosado px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-7">
          {canAddToCart ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-[var(--rose)] text-[15px] font-extrabold text-white shadow-[0_8px_20px_rgba(181,101,118,0.35)] transition hover:brightness-105"
              >
                {showPrice
                  ? `Agregar al pedido · $${formatCents(lineSubtotalCents)} ${currency}`
                  : `Agregar ${quantity}× ${presentation?.label ?? product.name} a mi pedido`}
              </button>
              <p className="m-0 text-center text-[11.5px] text-cacao-tenue">
                Puedes seguir agregando otros pasteles o formatos antes de enviar tu pedido por WhatsApp.
              </p>
            </div>
          ) : submit.kind === "done" ? (
            <div aria-live="polite" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="m-0 text-[15px] font-bold text-cacao">
                  Pedido <strong>#{submit.order.order_code.replace(/^#/, "")}</strong> registrado
                  {showPrice ? ` · Total $${formatCents(submit.order.total_cents)} ${currency}` : ""}
                </p>
                <a
                  href={`/pedido/${encodeURIComponent(submit.order.tracking_token ?? submit.order.order_code.replace(/^#/, ""))}`}
                  className="text-[12.5px] font-bold text-[var(--rose)] underline"
                >
                  Ver seguimiento →
                </a>
              </div>

              {submit.warning && (
                <p className="m-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
                  {submit.warning}
                </p>
              )}

              {submit.paymentLinkUrl && (
                <>
                  <div className="rounded-xl border border-[#E6C7CF] bg-white px-3.5 py-2.5 text-[12.5px] leading-snug text-cacao">
                    <strong className="block text-[var(--rose)]">
                      💳 Redirigiendo a Stripe México (MXN)...
                    </strong>
                    Te estamos redirigiendo a la pasarela segura de Stripe. Una vez completado el pago, <strong>regresarás automáticamente a nuestra página</strong> con el estado actualizado de tu pedido.
                  </div>
                  <a
                    href={submit.paymentLinkUrl}
                    className="flex h-[50px] items-center justify-center gap-2 rounded-full bg-[var(--rose)] text-[15px] font-extrabold text-white shadow-md no-underline transition hover:brightness-105"
                  >
                    {CardIcon}
                    Pagar ahora en Stripe (MXN)
                  </a>
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`/pedido/${encodeURIComponent(submit.order.tracking_token ?? submit.order.order_code.replace(/^#/, ""))}`}
                  className="flex h-[42px] items-center justify-center rounded-full border border-[var(--line-2)] bg-white text-[13px] font-bold text-cacao no-underline transition hover:bg-stone-50"
                >
                  Seguir mi pedido
                </a>
                <a
                  href={submit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[42px] items-center justify-center gap-1.5 rounded-full bg-whatsapp text-[13px] font-bold text-white shadow-sm no-underline"
                >
                  {WhatsAppIcon}
                  WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <>
              {showPrice && (
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <span className="text-[13px] font-medium text-cacao-suave">
                    Total estimado (Anticipo 50%: ${formatCents(Math.round(estimateCents / 2))} {currency}):
                  </span>
                  <span className="text-[26px] font-black text-cacao">
                    ${formatCents(estimateCents)} <span className="text-[14px] font-bold text-cacao-suave">{currency}</span>
                  </span>
                </div>
              )}
              <p className="mt-0 mb-1.5 text-[12px] text-cacao-tenue">
                {isStripeCardCheckout
                  ? "Pago seguro en línea con Stripe México (MXN) y confirmación por WhatsApp."
                  : "Coordinamos disponibilidad, envío en Mérida y anticipo del 50% por WhatsApp."}
              </p>
              {submit.kind === "error" && (
                <p role="alert" className="mt-0 mb-3 text-[14px] text-rosa-fuerte">
                  {submit.message}{" "}
                  <a href={catalogBridgeHref(product.slug)} target="_blank" rel="noopener" className="font-bold underline">
                    Escríbenos directo por WhatsApp
                  </a>
                </p>
              )}
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={submit.kind === "sending"}
                  className={`flex h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-0 text-[15px] font-extrabold text-white transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70 ${
                    isStripeCardCheckout
                      ? "bg-[var(--rose)] shadow-[0_8px_20px_rgba(181,101,118,0.35)]"
                      : "bg-whatsapp shadow-[0_8px_20px_rgba(37,211,102,0.35)]"
                  }`}
                >
                  {submit.kind !== "sending" && (isStripeCardCheckout ? CardIcon : WhatsAppIcon)}
                  {submit.kind === "sending"
                    ? isStripeCardCheckout
                      ? "Redirigiendo a Stripe México..."
                      : "Preparando tu pedido..."
                    : isStripeCardCheckout
                      ? `Pagar con Stripe${showPrice ? ` · $${formatCents(estimateCents)} ${currency}` : ""}`
                      : "Conformar Pedido por WhatsApp"}
                </button>
              </div>
            </>
          )}
        </div>
      </form>
      </div>
    </div>
  );
}
