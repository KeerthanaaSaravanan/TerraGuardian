import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { SupportedLanguage, LanguageMeta, SUPPORTED_LANGUAGES } from "../i18n/languages";
import { translate } from "../i18n/core";

export interface I18nContextValue {
  lang: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languages: LanguageMeta[];
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string;
}

const STORAGE_KEY = "tg_ops_language";

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLanguage>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
      if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
        return stored;
      }
    } catch {
      // localStorage may fail in sandboxed iframes
    }
    return "en";
  });

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>, fallback?: string) => {
      return translate(key, lang, params, fallback);
    },
    [lang]
  );

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLanguage,
        languages: SUPPORTED_LANGUAGES,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback if called outside provider
    return {
      lang: "en",
      setLanguage: () => {},
      languages: SUPPORTED_LANGUAGES,
      t: (key: string, params?: Record<string, string | number>, fallback?: string) =>
        translate(key, "en", params, fallback),
    };
  }
  return context;
}
