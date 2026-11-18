-- Migración idempotente: Activar pedidos y pagos con TropiPay para Dulce Delia (dulce-delia)
-- y crear tabla privada de credenciales por tienda (store_payment_credentials).

begin;

-- 1. Tabla privada de credenciales de pasarela por tienda (solo accesible por OWNER o service_role)
create table if not exists public.store_payment_credentials (
  store_id uuid primary key references public.stores(id) on delete cascade,
  tropipay_client_id text,
  tropipay_client_secret text,
  tropipay_env text not null default 'sandbox' check (tropipay_env in ('sandbox', 'production')),
  updated_at timestamptz not null default now()
);

alter table public.store_payment_credentials enable row level security;

revoke all on public.store_payment_credentials from anon, public;
grant select, insert, update, delete on public.store_payment_credentials to authenticated;

drop policy if exists "Owner manage payment credentials" on public.store_payment_credentials;
create policy "Owner manage payment credentials" on public.store_payment_credentials
  for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

-- 2. Actualizar settings de checkout y pago exclusivamente para dulce-delia
update public.stores
set save_orders = true,
    show_delivery_zone = false,
    order_prefix = 'DEL',
    payment_provider = 'TROPIPAY',
    auto_generate_payment_link = true,
    payment_methods = '{CARD_LINK}'
where slug = 'dulce-delia';

commit;
