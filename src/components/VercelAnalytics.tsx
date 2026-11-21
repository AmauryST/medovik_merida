"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";

function isAllowedAnalyticsPath(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (!clean.startsWith("/admin")) return true;
  return clean === "/admin/login";
}

function isAllowedAnalyticsUrl(rawUrl: string): boolean {
  try {
    const { pathname } = new URL(rawUrl, "https://medovik-merida.vercel.app");
    return isAllowedAnalyticsPath(pathname);
  } catch {
    return !rawUrl.includes("/admin") || rawUrl.includes("/admin/login");
  }
}

/**
 * Renders Vercel Analytics only on public routes and `/admin/login`.
 * Any catalog administration or other `/admin/*` activity is excluded.
 */
export function VercelAnalytics() {
  const pathname = usePathname();

  if (pathname && !isAllowedAnalyticsPath(pathname)) {
    return null;
  }

  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        if (!isAllowedAnalyticsUrl(event.url)) {
          return null;
        }
        return event;
      }}
    />
  );
}
