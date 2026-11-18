import { draftMode } from "next/headers";
import { getHomeCatalogData } from "@/lib/catalog/queries";
import { getPreviewCatalogData } from "@/lib/catalog/preview";
import { PreviewBar } from "@/components/admin/PreviewBar";
import { HomeStorefront } from "@/components/HomeStorefront";

export const revalidate = 60;

export default async function HomePage() {
  const { isEnabled: isDraft } = await draftMode();
  const data = isDraft
    ? ((await getPreviewCatalogData()) ?? (await getHomeCatalogData()))
    : await getHomeCatalogData();

  return (
    <div className="min-h-screen bg-crema">
      {isDraft && <PreviewBar />}
      <HomeStorefront
        products={data.products}
        categories={data.categories}
        store={data.store}
        deliveryZones={data.deliveryZones}
        billboard={data.billboard}
      />
    </div>
  );
}
