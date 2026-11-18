# Reglas de Arquitectura — Medovik Mérida (ZunConnect Multi-Tenant)

Este repositorio implementa el storefront y consola de administración `/admin` para **Medovik Mérida** (`store_slug = 'medovik-merida'`), repostería especializada en **Pastel Ruso de Miel (Medovik)** artesanal ubicada en **Mérida, Yucatán, México**, operando sobre la infraestructura multi-tenant compartida de **ZunConnect** en Supabase.

## Diferencias Clave del Emprendimiento

1. **Ubicación y Moneda (México):**
   - Ciudad: **Mérida, Yucatán, México** (`country_code = 'MX'`, zona horaria `America/Merida`).
   - Moneda: **Pesos Mexicanos (`MXN`)**.
   - WhatsApp de pedidos: **`+52 999 903 0512`** (`529999030512`).
2. **Emprendimiento Joven y Auténtico (Fundado en Octubre en Instagram `@medovik_merida`):**
   - No utiliza reseñas antiguas de Facebook ni métricas ficticias.
   - Destaca **La Dulce Leyenda del Medovik** (la historia imperial de la emperatriz Isabel), la filosofía de sus **3 pilares artesanales** (*Ingredientes de calidad*, *Elaboración artesanal en pequeños lotes*, *Tiempo y dedicación: capas horneadas y ensambladas una por una*) explicada por su chef pastelera, y su comunidad en Instagram `@medovik_merida`.
3. **Menú Oficial de 3 Sabores y 3 Tamaños:**
   - **Caramelo Salado & Nuez Pecana:** Grande (~2,45 kg) `$1,200 MXN` · Mediano (~1,225 kg) `$600 MXN` · Porción (~180 g) `$100 MXN`.
   - **Spartak (Miel, Cacao, Ciruela Pasa y Nuez):** Grande (~2,45 kg) `$1,200 MXN` · Mediano (~1,225 kg) `$600 MXN` · Porción (~180 g) `$100 MXN`.
   - **Clásico (Miel Natural y Crema Suave):** Grande (~2,45 kg) `$1,000 MXN` · Mediano (~1,225 kg) `$500 MXN` · Porción (~180 g) `$100 MXN`.

## 7 Reglas Inquebrantables de Arquitectura

1. **Aislamiento Multi-Tenant Estricto:** Toda consulta a Supabase filtra por `store_id` resuelto mediante `NEXT_PUBLIC_STORE_SLUG="medovik-merida"`.
2. **Prohibición de URLs de Imágenes Hardcodeadas en BD:** Los productos nunca guardan URLs directas en la tabla `products`. El catálogo público consume `public.v_catalog_products` y lee `product.media_by_slot[SLOT_CODE]` (`PRODUCT_PRIMARY`, `PRODUCT_GALLERY`, `PRODUCT_PRESENTATION`, `PRODUCT_INFO_GUIDE`, `PRODUCT_REVIEW_PROOF`).
3. **Cero Base64 en Base de Datos:** No existe columna `blur_data_url`. Toda imagen usa `<SlotImage>` con esqueleto CSS y fallback local `/placeholders/default-cake.svg`.
4. **Formateo de Precios:** Todos los precios viven en la base de datos como centavos enteros (`*_cents`, ej. `$1,200 MXN` = `120000`). Sólo se formatean en la capa de presentación mediante `formatCents(cents)`.
5. **Flujo de Checkout Dual (WhatsApp Directo / RPC):** Soporta tanto el flujo directo de WhatsApp (`save_orders = false`) como el registro transaccional vía `supabase.rpc('create_checkout_order', payload)` (`save_orders = true`).
6. **Flujo de Aprobación / Publicación:** Los propietarios listados en `BRAND.ownerEmails` publican directamente; los editores generan borradores (`pending_changes`).
7. **Estándar de Imágenes WebP:** Las imágenes subidas desde `/admin` o `npm run migrate:catalog` se convierten a `.webp` (`1000x1000`, calidad 82) en `product-images/{store_id}/{uuid}.webp`.
