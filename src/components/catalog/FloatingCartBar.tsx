"use client";

import { useCart } from "@/components/catalog/CartContext";
import { BRAND } from "@/config/brand";
import { formatCents } from "@/types/catalog";

export function FloatingCartBar() {
  const {
    store,
    checkoutConfig,
    items,
    itemCount,
    subtotalCents,
    isCartOpen,
    openCart,
    isPriceVisibleFor,
  } = useCart();

  if (checkoutConfig.order_mode === "SINGLE_PRODUCT" || itemCount === 0 || isCartOpen) {
    return null;
  }

  const currency = store.currency || BRAND.currency;
  const allItemsHaveVisiblePrice =
    items.length > 0 && items.every((item) => isPriceVisibleFor(item.productSlug || item.productId));

  return (
    <div className="animate-order-slide-up pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center px-4 pb-[env(safe-area-inset-bottom)]">
      <button
        type="button"
        onClick={openCart}
        aria-label={`Ver tu pedido (${itemCount})`}
        className="pointer-events-auto flex w-full max-w-sm cursor-pointer items-center justify-between gap-3 rounded-full border border-white/20 bg-cacao px-4 py-2.5 text-white shadow-[0_14px_34px_rgba(61,35,20,0.34)] transition hover:scale-[1.01] hover:bg-[#4a2b19] active:scale-[0.98]"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 min-w-[32px] items-center justify-center rounded-full bg-rosa-profundo px-2 text-xs font-extrabold text-white">
            {itemCount}
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-crema">
            Revisar y enviar pedido
          </span>
        </div>

        <div className="flex items-center gap-2 pr-1">
          {allItemsHaveVisiblePrice ? (
            <span className="text-[15px] font-extrabold text-white tabular-nums">
              ${formatCents(subtotalCents)} {currency}
            </span>
          ) : (
            <span className="text-xs font-bold text-dorado-suave">
              Confirmar →
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
