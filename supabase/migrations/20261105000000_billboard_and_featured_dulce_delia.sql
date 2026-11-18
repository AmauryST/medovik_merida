-- Migración idempotente para Billboard editorial y Productos Destacados en Donde Delia
-- Store ID: db2a699e-43bb-4770-8260-adcf910fbc00 (slug: 'dulce-delia')

-- 1. Columna is_featured en products
alter table public.products
  add column if not exists is_featured boolean not null default false;

-- 2. Tabla para persistencia relacional del billboard
create table if not exists public.store_billboard_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  media_id uuid references public.media_assets(id) on delete set null,
  image_url text,
  image_alt text,
  kicker text not null default '',
  title text not null,
  subtitle text,
  cta_label text not null default 'Ver más',
  target_type text not null check (target_type in ('PRODUCT', 'CATEGORY', 'PRICE_RANGE', 'LINK')),
  target_value text not null default '',
  placement text not null default 'BOTH' check (placement in ('BOTH', 'HOME', 'PEDIDOS')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices de consulta rápida
create index if not exists idx_store_billboard_items_store_order
  on public.store_billboard_items (store_id, is_active, sort_order);

-- Habilitar RLS
alter table public.store_billboard_items enable row level security;

-- Política de lectura pública para elementos activos
drop policy if exists "store_billboard_public_read" on public.store_billboard_items;
create policy "store_billboard_public_read"
  on public.store_billboard_items
  for select
  using (is_active = true);

-- Política de gestión para administradores / miembros de la tienda
drop policy if exists "store_billboard_admin_all" on public.store_billboard_items;
create policy "store_billboard_admin_all"
  on public.store_billboard_items
  for all
  using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = store_billboard_items.store_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = store_billboard_items.store_id
        and sm.user_id = auth.uid()
    )
  );

-- 3. Vista v_store_billboard
create or replace view public.v_store_billboard as
select
  id,
  store_id,
  media_id,
  image_url,
  image_alt,
  kicker,
  title,
  subtitle,
  cta_label,
  target_type,
  target_value,
  placement,
  is_active,
  sort_order
from public.store_billboard_items
where is_active = true
order by sort_order asc;

-- 4. Re-crear vista v_catalog_products para asegurar que is_featured esté expuesto
create or replace view public.v_catalog_products as
select
  p.id,
  p.store_id,
  p.slug,
  p.name,
  p.sku,
  p.description,
  p.short_description,
  p.price_cents,
  p.compare_at_price_cents,
  p.is_featured,
  p.is_available,
  p.sort_order,
  (
    select ma.public_url
    from public.media_placements mp
    join public.media_assets ma on ma.id = mp.media_id
    where mp.product_id = p.id
      and mp.slot_code = 'PRODUCT_PRIMARY'
      and mp.is_active = true
    order by mp.sort_order asc
    limit 1
  ) as primary_image_url,
  coalesce(
    (
      select jsonb_object_agg(slot_data.slot_code, slot_data.assets)
      from (
        select
          mp.slot_code,
          jsonb_agg(
            jsonb_build_object(
              'id', mp.id,
              'media_id', ma.id,
              'url', ma.public_url,
              'alt', coalesce(mp.caption, ma.alt_text),
              'label', mp.label,
              'price_delta_cents', mp.price_delta_cents,
              'sort_order', mp.sort_order
            ) order by mp.sort_order
          ) as assets
        from public.media_placements mp
        join public.media_assets ma on ma.id = mp.media_id
        where mp.product_id = p.id and mp.is_active = true
        group by mp.slot_code
      ) as slot_data
    ),
    '{}'::jsonb
  ) as media_by_slot,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'group', c.group_type
        ) order by c.sort_order
      )
      from public.product_categories pc
      join public.categories c on c.id = pc.category_id
      where pc.product_id = p.id and c.is_active = true
    ),
    '[]'::jsonb
  ) as categories,
  p.attributes
from public.products p
where p.publication_status = 'PUBLISHED'
  and p.is_live = true;

-- 5. Semilla inicial de productos destacados y billboard para dulce-delia exclusivamente
do $$
declare
  v_store_id uuid;
begin
  select id into v_store_id from public.stores where slug = 'dulce-delia';
  if v_store_id is not null then
    -- Activar is_featured en los 5 productos estrella
    update public.products
    set is_featured = true
    where store_id = v_store_id
      and slug in (
        'nata-chocolate-1',
        'nata-almendras',
        'cumple-dorado',
        'boda-perlas',
        'nino-unicornio'
      );

    -- Insertar anuncios iniciales en store_billboard_items
    insert into public.store_billboard_items (
      id, store_id, kicker, title, subtitle, cta_label,
      target_type, target_value, placement, is_active, sort_order
    )
    values
      (
        'a0000000-0000-0000-0000-000000000001',
        v_store_id,
        'Especialidad de la Casa',
        'Cake de Nata con Chocolate y Almendras',
        'Bizcocho esponjoso bañado en sirope suave, relleno de crema de nata montada y cobertura de ganache artesanal.',
        'Encargar pastel',
        'PRODUCT',
        'nata-chocolate-1',
        'BOTH',
        true,
        1
      ),
      (
        'a0000000-0000-0000-0000-000000000002',
        v_store_id,
        'Bodas y Aniversarios',
        'Momentos inolvidables con diseño exclusivo',
        'Diseños sobrios y elegantes de varios pisos en crema texturizada, perlas y apliques para tu gran día.',
        'Ver colección',
        'CATEGORY',
        'bodas',
        'BOTH',
        true,
        2
      )
    on conflict (id) do nothing;
  end if;
end;
$$;
