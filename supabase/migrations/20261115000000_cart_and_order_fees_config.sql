-- Migración idempotente: Configuración por tienda para el carrito ("Mi Pedido"),
-- tipo de negocio (Pastelería/Regalos, Restaurante, Tienda) y cálculo de envío/cargos.
-- Persiste en stores.theme_config.checkout sin romper ni sobrescribir configuraciones previas.

begin;

update public.stores
set theme_config = coalesce(theme_config, '{}'::jsonb) || jsonb_build_object(
  'checkout',
  jsonb_build_object(
    'order_mode', 'HYBRID',
    'business_preset', 'BAKERY_GIFT',
    'shipping_fee_mode', case when show_delivery_zone then 'ZONE_SELECTOR' else 'ADMIN_QUOTE_LATER' end,
    'fixed_shipping_fee_cents', 0,
    'default_extra_fees', '[]'::jsonb,
    'allow_immediate_payment_without_shipping', true
  )
)
where slug = 'dulce-delia'
  and (theme_config is null or not (theme_config ? 'checkout'));

commit;
