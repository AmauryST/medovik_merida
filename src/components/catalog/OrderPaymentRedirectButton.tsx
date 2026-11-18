"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BRAND } from "@/config/brand";
import type { OrderStatus } from "@/types/catalog";

interface Props {
  orderCode: string;
  currentStatus: OrderStatus;
  paymentLinkUrl: string | null;
  totalUsdFormatted: string;
  currency?: string;
  returnedSuccess: boolean;
}

export function OrderPaymentRedirectButton({
  orderCode,
  currentStatus,
  paymentLinkUrl,
  totalUsdFormatted,
  currency = BRAND.currency,
  returnedSuccess,
}: Props) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [checking, setChecking] = useState(false);

  const isPendingPayment =
    currentStatus === "AWAITING_PAYMENT" || currentStatus === "PENDING_CONFIRMATION";

  useEffect(() => {
    if (!returnedSuccess || !isPendingPayment) return;

    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts += 1;
      if (attempts > 8) {
        window.clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { status?: OrderStatus; paid_at?: string | null };
        if (data.status && data.status !== currentStatus) {
          window.clearInterval(interval);
          router.refresh();
        }
      } catch {
        // Ignore transient network errors
      }
    }, 3500);

    return () => window.clearInterval(interval);
  }, [returnedSuccess, isPendingPayment, orderCode, currentStatus, router]);

  function handlePayClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!paymentLinkUrl) return;
    e.preventDefault();
    setRedirecting(true);
    window.setTimeout(() => {
      window.location.href = paymentLinkUrl;
    }, 1800);
  }

  async function handleManualRefresh() {
    setChecking(true);
    try {
      await fetch(`/api/orders/${encodeURIComponent(orderCode)}/status`, { cache: "no-store" });
      router.refresh();
    } finally {
      window.setTimeout(() => setChecking(false), 600);
    }
  }

  return (
    <div className="space-y-3">
      {isPendingPayment && paymentLinkUrl && (
        <div className="rounded-2xl border border-[#E6C7CF] bg-[#FDF6F8] p-4">
          <p className="m-0 mb-2.5 text-[12.5px] leading-snug text-cacao-suave">
            🔒 <strong>Aviso de redirección segura:</strong> Al continuar hacia el pago, saldrás temporalmente de nuestro sitio hacia la pasarela segura de pago. Una vez completado el pago, <strong>regresarás automáticamente a esta misma página</strong> con tu estado actualizado.
          </p>

          {redirecting ? (
            <div className="rounded-xl bg-white p-3 text-center text-[13.5px] font-bold text-[var(--rose)] shadow-sm">
              🔄 Redirigiendo a la página de pago... Al completar tu pago regresarás automáticamente a esta página.
            </div>
          ) : (
            <a
              href={paymentLinkUrl}
              onClick={handlePayClick}
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[var(--rose)] text-[15px] font-extrabold text-white shadow-md no-underline transition hover:brightness-105"
            >
              Pagar ahora con tarjeta (${totalUsdFormatted} {currency})
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={checking}
          className="cursor-pointer rounded-full border border-[#E6DCD2] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-cacao-suave transition hover:bg-stone-50 disabled:opacity-60"
        >
          {checking ? "Verificando estado..." : "↻ Actualizar estado del pedido"}
        </button>
      </div>
    </div>
  );
}
