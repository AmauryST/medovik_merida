import type { AdminProduct } from "@/types/admin";
import type { Cents } from "@/types/catalog";

/*
 * Staging → approval → production. Edits to a live product (`is_live = true`)
 * never touch its live columns: they are stored in `products.draft_data`
 * (same keys as the columns) with `publication_status = 'PENDING_APPROVAL'`,
 * and an OWNER publishes them with `rpc('approve_and_publish_product')`.
 */

/** Product columns that go through approval when the product is live. */
export const DRAFT_FIELDS = ["name", "short_description", "description", "price_cents"] as const;

export type DraftField = (typeof DRAFT_FIELDS)[number];

export interface ProductDraft {
  name?: string;
  short_description?: string | null;
  description?: string | null;
  price_cents?: Cents;
}

export const DRAFT_FIELD_LABELS: Record<DraftField, string> = {
  name: "Nombre",
  short_description: "Frase corta",
  description: "Descripción",
  price_cents: "Precio",
};

/** Keeps only the known draft keys of a `draft_data` value read from the database. */
export function readDraft(value: unknown): ProductDraft {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const draft: ProductDraft = {};
  if (typeof source.name === "string") draft.name = source.name;
  if (typeof source.short_description === "string" || source.short_description === null) {
    draft.short_description = source.short_description as string | null;
  }
  if (typeof source.description === "string" || source.description === null) {
    draft.description = source.description as string | null;
  }
  if (typeof source.price_cents === "number" && Number.isInteger(source.price_cents)) {
    draft.price_cents = source.price_cents;
  }
  return draft;
}

export type EditableProductFields = Pick<AdminProduct, DraftField>;

/** Live values with the pending draft applied: what the editor shows. */
export function withDraft(product: EditableProductFields, draft: ProductDraft): EditableProductFields {
  return { ...product, ...draft };
}

export interface DraftChange {
  field: DraftField;
  live: EditableProductFields[DraftField];
  draft: EditableProductFields[DraftField];
}

/** Fields whose draft value differs from production, in display order. */
export function draftChanges(product: EditableProductFields, draft: ProductDraft): DraftChange[] {
  return DRAFT_FIELDS.filter((field) => field in draft && draft[field] !== product[field]).map((field) => ({
    field,
    live: product[field],
    draft: draft[field] as EditableProductFields[DraftField],
  }));
}
