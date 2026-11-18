"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SignatureLinesSection from "@/components/SignatureLinesSection";
import LegendAndQualitySection from "@/components/LegendAndQualitySection";
import HowItWorks from "@/components/HowItWorks";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/catalog/CartContext";
import {
  CatalogSection,
  type CatalogCollection,
} from "@/components/catalog/CatalogSection";
import { FloatingCartBar } from "@/components/catalog/FloatingCartBar";
import { OrderCartDrawer } from "@/components/catalog/OrderCartDrawer";
import { ProductDrawer } from "@/components/catalog/ProductDrawer";
import type {
  BillboardItem,
  CatalogProduct,
  Category,
  DeliveryZone,
  StorePublic,
} from "@/types/catalog";

interface HomeStorefrontProps {
  products: CatalogProduct[];
  categories: Category[];
  store: StorePublic;
  deliveryZones: DeliveryZone[];
  billboard?: readonly BillboardItem[];
}

export function HomeStorefront({
  products,
  categories,
  store,
  deliveryZones,
  billboard = [],
}: HomeStorefrontProps) {
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(
    null,
  );
  const [externalCollection, setExternalCollection] = useState<{
    value: CatalogCollection;
    nonce: number;
  } | null>(null);

  return (
    <CartProvider store={store}>
      <div className="min-h-screen flex flex-col bg-crema text-cacao">
        <Navbar />

        <main className="flex-1">
          {/* 1. Hero — Receta Rusa de Miel en Mérida */}
          <Hero
            products={products}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />

          {/* 2. Los 3 Sabores Insignia y Precios en MXN (Grande, Mediano y Porción) */}
          <SignatureLinesSection
            products={products}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />

          {/* 3. Catálogo Interactivo con Filtros y Compra por WhatsApp */}
          <CatalogSection
            id="catalogo"
            railId="catalogo-rail"
            variant="home"
            showBillboard={true}
            billboard={billboard}
            kicker="Catálogo en Línea · Precios en MXN"
            title="Elige tu"
            titleHighlight="Medovik"
            subtitle="Disponibles en tamaño Grande (~2,45 kg), Mediano (~1,225 kg) y Porción individual (~180 g). Haz clic en cualquier presentación para ver detalles o pedir por WhatsApp en Mérida."
            store={store}
            deliveryZones={deliveryZones}
            products={products}
            allProducts={products}
            categories={categories}
            externalCollection={externalCollection}
            selectedProduct={selectedProduct}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />

          {/* 4. La Dulce Leyenda del Medovik + ¿Por qué nuestros pasteles tienen un precio diferente? */}
          <LegendAndQualitySection />

          {/* 5. Cómo hacer tu pedido en Mérida */}
          <HowItWorks />

          {/* 6. Contacto directo por WhatsApp 999 903 0512 e Instagram @medovik_merida */}
          <ContactSection />
        </main>

        <Footer />

        {/* Barra flotante y Drawer del pedido */}
        <FloatingCartBar />
        <OrderCartDrawer zones={deliveryZones} />

        {/* Drawer de detalle de producto */}
        {selectedProduct && (
          <ProductDrawer
            key={selectedProduct.id}
            product={selectedProduct}
            store={store}
            zones={deliveryZones}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </div>
    </CartProvider>
  );
}

export default HomeStorefront;
