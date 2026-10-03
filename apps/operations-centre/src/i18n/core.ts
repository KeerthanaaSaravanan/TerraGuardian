import { SupportedLanguage } from "./languages";
import { en } from "./translations/en";
import { hi } from "./translations/hi";
import { as } from "./translations/as";
import { bn } from "./translations/bn";
import { ne } from "./translations/ne";
import { mni } from "./translations/mni";
import { lus } from "./translations/lus";
import { brx } from "./translations/brx";

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en,
  hi,
  as,
  bn,
  ne,
  mni,
  lus,
  brx,
};

/**
 * Humanizes a fallback key (e.g., "ops_btn_exit" -> "Exit", "btn_confirm" -> "Confirm")
 * to guarantee that raw machine keys are never shown in user-facing UI.
 */
function humanizeKey(key: string): string {
  const cleaned = key.replace(/^(ops_|btn_|nav_|layer_|legend_|drawer_|state_|priority_|hazard_|status_)/, "");
  return cleaned
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Deterministic translation lookup with strict English fallback and template param interpolation.
 */
export function translate(
  key: string,
  lang: SupportedLanguage,
  params?: Record<string, string | number>,
  fallback?: string
): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS["en"];
  let text = dict[key];

  if (!text && lang !== "en") {
    text = TRANSLATIONS["en"][key];
  }

  if (!text) {
    text = fallback || humanizeKey(key);
  }

  if (params && typeof text === "string") {
    for (const [paramKey, val] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(val));
    }
  }

  return text;
}
