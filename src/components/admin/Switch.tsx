"use client";

/** On/off switch with a 52x32 touch target. Purely presentational. */
export function Switch({
  checked,
  onToggle,
  label,
  disabled = false,
}: {
  checked: boolean;
  onToggle: () => void;
  /** Accessible name. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
      className={`relative h-8 w-13 shrink-0 rounded-full transition-colors ${
        checked ? "bg-emerald-600" : "bg-stone-300"
      } ${disabled ? "opacity-70" : ""}`}
    >
      <span
        aria-hidden
        className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
