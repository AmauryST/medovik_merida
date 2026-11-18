"use client";

import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import {
  LegendEditorialSection,
  WhyMedovikSection,
} from "@/components/LegendAndQualitySection";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/components/catalog/CartContext";
import { CatalogSection } from "@/components/catalog/CatalogSection";
import { FloatingCartBar } from "@/components/catalog/FloatingCartBar";
import { OrderCartDrawer } from "@/components/catalog/OrderCartDrawer";
import type {
  BillboardItem,
  CatalogProduct,
  Category,
  DeliveryZone,
  StorePublic,
} from "@/types/catalog";

interface HomeStorefrontProps {
  store: StorePublic;
  categories?: Category[];
  featured?: CatalogProduct[];
  products: CatalogProduct[];
  zones?: DeliveryZone[];
  deliveryZones?: DeliveryZone[];
  billboard?: BillboardItem[];
  billboardItems?: BillboardItem[];
  stripeEnabled?: boolean;
}

export function HomeStorefront({
  store,
  categories = [],
  products,
  zones,
  deliveryZones,
  billboard,
  billboardItems,
}: HomeStorefrontProps) {
  const resolvedZones = deliveryZones ?? zones ?? [];
  const resolvedBillboard = billboard ?? billboardItems ?? [];

  return (
    <CartProvider store={store}>
      <div className="min-h-screen flex flex-col bg-crema text-cacao">
        <Navbar />
        <main className="flex-1">
          {/* 1. Full-Bleed Atmospheric Hero with 3-Item Bottom Overlay Bar */}
          <Hero />

          {/* 2. "¿Por qué Medovik?" — 3 Minimalist Icon Columns */}
          <WhyMedovikSection />

          {/* 3. "Nuestros Pasteles Artesanales" — Minimalist Product Grid */}
          <CatalogSection
            store={store}
            categories={categories}
            products={products}
            zones={resolvedZones}
            billboardItems={resolvedBillboard}
            showBillboard={false}
          />

          {/* 4. Editorial Story Block with Signature */}
          <LegendEditorialSection />

          {/* 5. 2-Column Ordering Steps & Direct Mérida Contact */}
          <HowItWorks />
        </main>
        <Footer />
      </div>

      <FloatingCartBar />
      <OrderCartDrawer zones={resolvedZones} />
    </CartProvider>
  );
}

export default HomeStorefront;
