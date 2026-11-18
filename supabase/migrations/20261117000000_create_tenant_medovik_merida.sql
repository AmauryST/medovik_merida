-- ============================================================
-- Migración: Aprovisionamiento del tenant Medovik Mérida (MX)
-- Slug: medovik-merida
-- País: México (MX) · Moneda: MXN · Ciudad: Mérida, Yucatán
-- WhatsApp: 529999030512 (+52 999 903 0512)
-- Instagram: @medovik_merida (fundado en octubre)
-- ============================================================

DO $$
DECLARE
  v_store_id uuid;
  v_owner_id uuid;
BEGIN
  INSERT INTO public.stores (
    slug,
    name,
    country_code,
    currency,
    whatsapp_number,
    enable_whatsapp_checkout,
    is_active,
    save_orders,
    show_delivery_zone,
    payment_methods
  )
  VALUES (
    'medovik-merida',
    'Medovik Mérida',
    'MX',
    'MXN',
    '529999030512',
    true,
    true,
    false,
    false,
    ARRAY['WHATSAPP_COORDINATION', 'TRANSFER', 'CASH']::text[]
  )
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        country_code = EXCLUDED.country_code,
        currency = EXCLUDED.currency,
        whatsapp_number = EXCLUDED.whatsapp_number,
        enable_whatsapp_checkout = EXCLUDED.enable_whatsapp_checkout,
        is_active = EXCLUDED.is_active
  RETURNING id INTO v_store_id;

  -- Categorías de Sabor (FLAVOR) y Tamaño/Presentación (OCCASION)
  INSERT INTO public.categories (store_id, slug, name, group_type, sort_order, is_featured_filter, is_active)
  VALUES
    (v_store_id, 'clasico', 'Medovik Clásico', 'FLAVOR', 1, true, true),
    (v_store_id, 'spartak', 'Spartak (Miel & Cacao)', 'FLAVOR', 2, true, true),
    (v_store_id, 'caramelo-salado', 'Caramelo Salado & Pecana', 'FLAVOR', 3, true, true),
    (v_store_id, 'mediano', 'Mediano (~1.225 kg)', 'OCCASION', 1, true, true),
    (v_store_id, 'grande', 'Grande (~2.45 kg)', 'OCCASION', 2, true, true),
    (v_store_id, 'porciones', 'Porción (~180 g)', 'OCCASION', 3, true, true),
    (v_store_id, 'especialidades', 'Ediciones Especiales', 'CAMPAIGN', 1, false, true)
  ON CONFLICT (store_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        group_type = EXCLUDED.group_type,
        sort_order = EXCLUDED.sort_order,
        is_featured_filter = EXCLUDED.is_featured_filter,
        is_active = EXCLUDED.is_active;

  -- Zona de entrega en Mérida, Yucatán
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_zones WHERE store_id = v_store_id
  ) THEN
    INSERT INTO public.delivery_zones (
      store_id,
      name,
      fee_cents,
      estimated_time_text,
      sort_order,
      is_active
    )
    VALUES (
      v_store_id,
      'Mérida, Yucatán (Entrega o recolección coordinada)',
      0,
      'Pasteles frescos hechos por pedido',
      1,
      true
    );
  END IF;

  -- Asignación de miembros propietarios si existen en auth.users
  FOR v_owner_id IN
    SELECT id FROM auth.users WHERE email IN ('amauryst@gmail.com')
  LOOP
    INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (v_store_id, v_owner_id, 'OWNER')
    ON CONFLICT (store_id, user_id) DO UPDATE SET role = 'OWNER';
  END LOOP;
END $$;
