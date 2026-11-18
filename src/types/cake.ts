/**
 * Tipos compartidos del sitio de Donde Delia.
 * El catálogo es una galería de productos reales (no un configurador).
 */

/** Categorías de la galería. */
export type Categoria = 'nata' | 'bodas' | 'cumpleanos' | 'ninos';

/** Un producto real de la galería. */
export interface Producto {
  id: string;
  name: string;
  description: string;
  categoria: Categoria;
  /** Ruta de la imagen optimizada en /assets/galeria. */
  image: string;
  alt: string;
}

/** Recomendación / opinión real de un cliente. */
export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  /** Origen de la opinión, ej. 'Reseña en Facebook'. */
  source: string;
  /** Color de acento (hex) usado en comillas y borde. */
  accent: string;
}

/** Datos del pedido recogidos en el formulario de contacto. */
export interface OrderData {
  customerName: string;
  customerEmail?: string;
  /** Qué pastel quiere (prellenado al pulsar "Pedir este" en la galería). */
  interes: string;
  occasion?: string;
  servings?: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  deliveryDate: string;
  cakeMessage?: string;
}
