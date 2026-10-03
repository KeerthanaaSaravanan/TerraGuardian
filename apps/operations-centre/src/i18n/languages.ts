export type SupportedLanguage = "en" | "hi" | "as" | "bn" | "ne" | "mni" | "lus" | "brx";

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English", nativeName: "English", region: "All NER Corridors" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", region: "National / NER" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", region: "Assam & Western Corridor" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", region: "Tripura & Barak Valley" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", region: "Sikkim & Western Ridge" },
  { code: "mni", name: "Manipuri", nativeName: "মৈতৈলোন্", region: "Manipur" },
  { code: "lus", name: "Mizo", nativeName: "Mizo ṭawng", region: "Mizoram" },
  { code: "brx", name: "Bodo", nativeName: "बर'", region: "Bodoland Region" },
];
