import type { Locale } from "@/i18n/dictionaries";

export type NamedEntity = {
  name: string;
  name_en?: string | null;
};

/** Prefer localized label; fall back to the other language, then raw name. */
export function displayName(entity: NamedEntity, locale: Locale): string {
  if (locale === "en") {
    const en = entity.name_en?.trim();
    if (en) return en;
  }
  return entity.name;
}
