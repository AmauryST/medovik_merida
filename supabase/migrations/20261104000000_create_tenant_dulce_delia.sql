-- Migración idempotente para dar de alta el tenant dulce-delia ("Donde Delia")
do $$
declare
  v_store_id uuid;
  v_user_id uuid;
begin
  insert into public.stores (
    slug, name, country_code, currency, whatsapp_number,
    enable_whatsapp_checkout, is_active, save_orders, show_delivery_zone, payment_methods
  )
  values (
    'dulce-delia', 'Donde Delia', 'CU', 'USD', '5358383378',
    true, true, false, false, '{WHATSAPP_COORDINATION}'
  )
  on conflict (slug) do update set
    name = excluded.name,
    country_code = excluded.country_code,
    currency = excluded.currency,
    whatsapp_number = excluded.whatsapp_number,
    enable_whatsapp_checkout = excluded.enable_whatsapp_checkout,
    is_active = excluded.is_active,
    save_orders = excluded.save_orders,
    show_delivery_zone = excluded.show_delivery_zone,
    payment_methods = excluded.payment_methods
  returning id into v_store_id;

  -- Categorías del catálogo de Dulce Delia
  insert into public.categories (store_id, name, slug, group_type, description, is_active, is_featured_filter, sort_order)
  values
    (v_store_id, 'Cakes de Nata', 'nata', 'OCCASION', 'Cakes artesanales de crema de nata y ganache', true, true, 1),
    (v_store_id, 'Bodas', 'bodas', 'OCCASION', 'Pasteles elegantes de varios pisos para bodas', true, true, 2),
    (v_store_id, 'Cumpleaños', 'cumpleanos', 'OCCASION', 'Pasteles festivos para celebrar cumpleaños', true, true, 3),
    (v_store_id, 'Niños', 'ninos', 'OCCASION', 'Pasteles infantiles temáticos', true, true, 4)
  on conflict (store_id, slug) do update set
    name = excluded.name,
    group_type = excluded.group_type,
    description = excluded.description,
    is_active = excluded.is_active,
    is_featured_filter = excluded.is_featured_filter,
    sort_order = excluded.sort_order;

  -- Zona de entrega base
  insert into public.delivery_zones (store_id, name, fee_cents, is_active, sort_order)
  values (v_store_id, 'La Habana (Coordinar por WhatsApp)', 0, true, 1)
  on conflict do nothing;

  -- Membresías OWNER (multi-tenant: amauryst@gmail.com, zunconnect.app@gmail.com y delia.ontivero88@gmail.com)
  for v_user_id in
    select id from auth.users where lower(email) in ('amauryst@gmail.com', 'zunconnect.app@gmail.com', 'delia.ontivero88@gmail.com')
  loop
    insert into public.store_members (store_id, user_id, role)
    values (v_store_id, v_user_id, 'OWNER')
    on conflict (store_id, user_id) do update set role = 'OWNER';
  end loop;
end;
$$;
