import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin · Donde Delia", template: "%s · Admin Donde Delia" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF9",
  // Inputs use 16px text, so iOS does not zoom on focus; pinch-zoom stays on.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="admin">{children}</div>;
}


