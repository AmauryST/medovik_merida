-- Migration: Add flavor categories, remove nata as occasion, configure occasions
do $$
declare
  v_store_id uuid;
begin
  select id into v_store_id from public.stores where slug = 'dulce-delia';
  if v_store_id is null then
    return;
  end if;

  -- 1. Actualizar nata para que sea categoría de sabor (FLAVOR)
  update public.categories
  set group_type = 'FLAVOR', name = 'Nata', is_featured_filter = true, sort_order = 2
  where store_id = v_store_id and slug = 'nata';

  -- 2. Sabores (FLAVOR)
  insert into public.categories (store_id, name, slug, group_type, sort_order, is_featured_filter, is_active)
  values
    (v_store_id, 'Chocolate', 'chocolate', 'FLAVOR', 1, true, true),
    (v_store_id, 'Nata', 'nata', 'FLAVOR', 2, true, true),
    (v_store_id, 'Vainilla', 'vainilla', 'FLAVOR', 3, true, true),
    (v_store_id, 'Fresa', 'fresa', 'FLAVOR', 4, true, true),
    (v_store_id, 'Ganache', 'ganache', 'FLAVOR', 5, true, true),
    (v_store_id, 'Almendras', 'almendras', 'FLAVOR', 6, true, true),
    (v_store_id, 'Moca', 'moca', 'FLAVOR', 7, true, true),
    (v_store_id, 'Coco', 'coco', 'FLAVOR', 8, true, true),
    (v_store_id, 'Caramelo', 'caramelo', 'FLAVOR', 9, true, true)
  on conflict (store_id, slug) do update set
    name = excluded.name,
    group_type = excluded.group_type,
    sort_order = excluded.sort_order,
    is_featured_filter = excluded.is_featured_filter,
    is_active = excluded.is_active;

  -- 3. Ocasiones (is_featured_filter = false para que no salgan como chips de filtro)
  insert into public.categories (store_id, name, slug, group_type, sort_order, is_featured_filter, is_active)
  values
    (v_store_id, 'Cumpleaños', 'cumpleanos', 'OCCASION', 1, false, true),
    (v_store_id, 'Bodas', 'bodas', 'OCCASION', 2, false, true),
    (v_store_id, 'Niños', 'ninos', 'OCCASION', 3, false, true)
  on conflict (store_id, slug) do update set
    name = excluded.name,
    group_type = excluded.group_type,
    sort_order = excluded.sort_order,
    is_featured_filter = excluded.is_featured_filter,
    is_active = excluded.is_active;
end;
$$;
