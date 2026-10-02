import { useState, useEffect, useCallback } from "react";
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  getLanguage,
  setLanguage,
  t as translate,
} from "../services/citizenI18n";

export function useCitizenI18n() {
  const [lang, setLangState] = useState<SupportedLanguage>(getLanguage());

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<SupportedLanguage>;
      if (customEvent.detail) {
        setLangState(customEvent.detail);
      } else {
        setLangState(getLanguage());
      }
    };

    window.addEventListener("tg_lang_changed", handleLangChange);
    return () => window.removeEventListener("tg_lang_changed", handleLangChange);
  }, []);

  const changeLanguage = useCallback((newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: string) => {
      return translate(key, lang);
    },
    [lang]
  );

  return {
    lang,
    setLanguage: changeLanguage,
    t,
    languages: SUPPORTED_LANGUAGES,
  };
}
