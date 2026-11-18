/** Section whose requirements are still being defined with the store. */
export function PendingSection({ title, description }: { title: string; description: string }) {
  return (
    <section>
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-8 text-center">
        <p className="font-medium">En preparación</p>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </div>
    </section>
  );
}
