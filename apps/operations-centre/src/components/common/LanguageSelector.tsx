import React, { useState, useRef, useEffect } from "react";
import { useCitizenI18n } from "../../hooks/useCitizenI18n";
import { IconGlobe } from "../icons";

interface LanguageSelectorProps {
  className?: string;
  variant?: "glass" | "standard" | "compact";
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = "",
  variant = "standard",
}) => {
  const { lang, setLanguage, languages, t } = useCitizenI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const currentLangMeta = languages.find((l) => l.code === lang) || languages[0];

  const buttonStyle =
    variant === "glass"
      ? "border border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md shadow-sm"
      : "border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white shadow-xs";

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Language"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${buttonStyle}`}
      >
        <IconGlobe className={`w-3.5 h-3.5 shrink-0 ${variant === "glass" ? "text-cyan-300" : "text-cyan-600 dark:text-cyan-400"}`} />
        <span className="truncate max-w-[80px] sm:max-w-none">{currentLangMeta.nativeName}</span>
        <span className="text-[10px] opacity-70">▾</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            role="listbox"
            aria-label="Available Languages"
            className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 z-50 text-slate-800 dark:text-slate-200 text-xs backdrop-blur-xl animate-in fade-in duration-100"
          >
            <div className="px-2.5 py-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 mb-1 flex justify-between">
              <span>{t("select_language")}</span>
              <span className="text-emerald-600 dark:text-emerald-400">{t("lang_ner_regions")}</span>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {languages.map((l) => {
                const isSelected = lang === l.code;
                return (
                  <button
                    key={l.code}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setLanguage(l.code);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/40"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs leading-tight">{l.nativeName}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{l.name} • {l.region}</div>
                    </div>
                    {isSelected && (
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs font-black">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
