/**
 * Floating bar on the public home while Draft Mode is on. Tailwind classes
 * only (the home runs the El Ángel design system without preflight).
 */
export function PreviewBar() {
  return (
    <div
      role="status"
      className="fixed inset-x-3 top-3 z-[1000] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl bg-stone-900/95 px-4 py-3 text-sm text-white shadow-lg"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      <span className="font-semibold">Vista Previa de Cambios Pendientes</span>
      <a href="/api/admin/preview/?salir=1" className="shrink-0 rounded-full bg-white px-3 py-1.5 font-semibold text-stone-900">
        Salir
      </a>
    </div>
  );
}
