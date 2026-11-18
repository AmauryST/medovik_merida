# Medovik Mérida — Catálogo Digital Interactivo & Conformador de Pedidos (`MXN`)

Sitio web y catálogo interactivo para **Medovik Mérida** (`@medovik_merida`), pastelería artesanal especializada en **Pastel Ruso de Miel (Medovik)** en Mérida, Yucatán, México.

## Características Principales

- **3 Productos Maestros × 3 Formatos con Información Profunda:**
  1. **Medovik Clásico** (*Rebanada ~180 g*, *Mediano ~1,225 kg*, *Grande ~2,45 kg*)
  2. **Medovik Spartak — Miel, Cacao, Ciruela & Nuez** (*Rebanada ~180 g*, *Mediano ~1,225 kg*, *Grande ~2,45 kg*)
  3. **Medovik Caramelo Salado & Nuez Pecana** (*Rebanada ~180 g*, *Mediano ~1,225 kg*, *Grande ~2,45 kg*)
- **Modo Catálogo Demo (Precios Opcionales):**
  - Inicia por defecto con precios ocultos para potenciar el uso como catálogo informativo y conformador de pedidos.
  - Incluye interruptores para **mostrar u ocultar precios** globalmente o por cada pastel individual.
  - Cuando los precios están visibles, calcula automáticamente el **50% de anticipo** y el **50% restante al momento de la entrega**.
- **Conformación de Pedido hacia WhatsApp (`+52 999 903 0512`):**
  - Respeta las reglas operativas de Medovik Mérida: rebanadas sujetas a disponibilidad del día, pasteles completos con mínimo 2 días de anticipación, confirmación con 50% de anticipo y envío en Mérida con tarifa mínima en ruta compartida.
- **Arquitectura Lista para Stripe México (`MXN`):**
  - Endpoint `/api/checkout/stripe` preparado para cobrar el 50% de anticipo o el total en Pesos Mexicanos (`MXN`) mediante Stripe Checkout.

---

## Despliegue en Vercel (Sin Dominio Propio · Gratis en `*.vercel.app`)

El proyecto está configurado para desplegarse **Zero-Config** en Vercel incluso sin dominio propio ni base de datos externa (funciona de inmediato con el catálogo maestro integrado):

1. Entra a [https://vercel.com/new](https://vercel.com/new) con tu cuenta conectada a GitHub.
2. Importa el repositorio **`AmauryST/medovik_merida`**.
3. Deja la configuración detectada automáticamente por Vercel (`Framework Preset: Next.js`, `Build Command: npm run build`).
4. Haz clic en **Deploy** (no necesitas agregar variables de entorno para el Modo Demo Catálogo + WhatsApp).
5. Obtendrás tu URL pública gratuita `https://medovik-merida.vercel.app` lista para colocar en la biografía de Instagram `@medovik_merida`.

> Si más adelante deseas activar el panel administrador con Supabase o el cobro en línea con Stripe México, consulta las variables opcionales en [`.env.example`](./.env.example).

---

## Desarrollo Local

```bash
npm install
npm run dev
```

Abre `http://localhost:3103` en tu navegador.
