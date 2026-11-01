"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  dictionaries,
  isLocale,
  type Dictionary,
  type Locale,
} from "@/i18n/dictionaries";

type LocaleCtx = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Dictionary;
};

const Ctx = createContext<LocaleCtx | null>(null);

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

function writeCookieLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
  document.documentElement.lang = locale === "ko" ? "ko" : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // SSR defaults to Korean; hydrate from cookie after mount (avoids root layout cookies()).
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const fromCookie = readCookieLocale();
    setLocaleState(fromCookie);
    document.documentElement.lang = fromCookie === "ko" ? "ko" : "en";
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeCookieLocale(next);
  }, []);

  const value = useMemo<LocaleCtx>(
    () => ({ locale, setLocale, t: dictionaries[locale] }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div
      className={`inline-flex rounded-full bg-white/90 p-0.5 text-[13px] font-semibold shadow-sm ring-1 ring-stone-200 ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("ko")}
        className={`rounded-full px-2.5 py-1.5 ${locale === "ko" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}
      >
        {t.langKo}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-full px-2.5 py-1.5 ${locale === "en" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}
      >
        {t.langEn}
      </button>
    </div>
  );
}
