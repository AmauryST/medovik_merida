import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin/session";
import { parseStoreCheckoutConfig } from "@/lib/catalog/cart";
import {
  getStoreEmailTemplates,
  getStoreIntegrationsSummary,
} from "@/lib/notifications/order-notifications";
import { encryptOrderTrackingToken } from "@/lib/orders/tracking-token";
import { getStoreTropiPayCredentials, type TropiPayEnv } from "@/lib/payments/tropipay";
import type { AdminOrderRow } from "@/types/admin";
import type { PaymentMethod, PaymentProvider } from "@/types/catalog";

import { OrdersLive } from "./OrdersLive";

export const metadata: Metadata = { title: "Pedidos, Pagos y CRM" };

/** Most recent orders; newer ones arrive through Realtime. */
const ORDER_LIMIT = 100;

interface StorePaymentSettingsRow {
  save_orders?: boolean;
  show_delivery_zone?: boolean;
  payment_provider?: PaymentProvider;
  payment_methods?: PaymentMethod[];
  order_prefix?: string;
  currency?: string;
  theme_config?: Record<string, unknown> | null;
}

export default async function PedidosPage() {
  const { supabase, store, role } = await requireAdmin();

  const [
    { data, error },
    { data: settings },
    creds,
    emailTemplates,
    integrationsSummary,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_code, status, created_at, subtotal_cents, delivery_fee_cents, payment_fee_cents, total_cents, currency, buyer_name, buyer_phone, buyer_email, recipient_name, recipient_phone, delivery_zone_name, delivery_address, delivery_date, delivery_time_slot, card_message, special_instructions, items, preferred_payment_method, payment_provider, payment_link_url, external_payment_id, external_reference, paid_at, webhook_payload",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(ORDER_LIMIT)
      .overrideTypes<AdminOrderRow[], { merge: false }>(),
    supabase
      .from("stores")
      .select("save_orders, show_delivery_zone, payment_provider, payment_methods, order_prefix, currency, theme_config")
      .eq("id", store.id)
      .maybeSingle<StorePaymentSettingsRow>(),
    role === "OWNER" ? getStoreTropiPayCredentials(store.id) : Promise.resolve(null),
    getStoreEmailTemplates(store.id),
    getStoreIntegrationsSummary(store.id),
  ]);

  const initialEnv: TropiPayEnv =
    creds?.env ??
    (process.env.TROPIPAY_ENV?.trim().toLowerCase() === "production"
      ? "production"
      : "sandbox");

  const checkoutConfig = parseStoreCheckoutConfig({
    theme_config: settings?.theme_config ?? null,
    show_delivery_zone: settings?.show_delivery_zone,
  });

  const initialOrdersWithTokens: AdminOrderRow[] = (data ?? []).map((order) => ({
    ...order,
    tracking_token: encryptOrderTrackingToken(order.order_code, store.id),
  }));

  return (
    <OrdersLive
      storeId={store.id}
      storeName={store.name}
      role={role}
      initialOrders={initialOrdersWithTokens}
      limit={ORDER_LIMIT}
      loadError={error?.message ?? null}
      savesOrders={settings?.save_orders !== false}
      initialEmailTemplates={emailTemplates}
      integrationsSummary={integrationsSummary}
      initialCheckoutConfig={checkoutConfig}
      paymentSettings={{
        saveOrders: settings?.save_orders !== false,
        paymentProvider: settings?.payment_provider ?? "NONE",
        paymentMethods: settings?.payment_methods ?? ["WHATSAPP_COORDINATION"],
        orderPrefix: settings?.order_prefix ?? "DEL",
        currency: settings?.currency ?? store.currency ?? "USD",
        tropiPayConfigured: Boolean(creds),
        tropiPaySource: creds?.source ?? null,
        tropiPayEnv: initialEnv,
        tropiPayClientIdHint: creds?.clientId
          ? `${creds.clientId.slice(0, 6)}…${creds.clientId.slice(-4)}`
          : null,
      }}
    />
  );
}
