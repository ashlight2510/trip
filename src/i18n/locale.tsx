"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { PointsBadge } from "@/components/points-badge";
import { ENABLE_CONTRIBUTE_POINTS } from "@/lib/features";

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
      aria-label={t.settingsLanguage}
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

/** Hamburger settings — language (and future prefs) live inside the panel. */
export function SettingsMenu({
  className = "",
  tone = "light",
}: {
  className?: string;
  /** Trip overlay uses dark chrome. */
  tone?: "light" | "dark";
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const btn =
    tone === "dark"
      ? "bg-black/45 text-white ring-white/20 hover:bg-black/60"
      : "bg-white text-stone-700 ring-stone-200 hover:bg-stone-50";
  const panel =
    tone === "dark"
      ? "bg-black/80 text-white ring-white/15 backdrop-blur"
      : "bg-white text-stone-900 ring-stone-200 shadow-lg";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.settings}
        onClick={() => setOpen((v) => !v)}
        className={`grid size-9 place-items-center rounded-full ring-1 ${btn}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-[600] mt-2 w-56 rounded-2xl p-3 ring-1 ${panel}`}
        >
          <p className={`text-[11px] font-medium tracking-wide ${tone === "dark" ? "text-white/60" : "text-stone-500"}`}>
            {t.settings}
          </p>
          <div className="mt-2.5">
            <p className={`mb-1.5 text-[12px] font-semibold ${tone === "dark" ? "text-white/85" : "text-stone-700"}`}>
              {t.settingsLanguage}
            </p>
            <LangToggle className={tone === "dark" ? "bg-white/10 ring-white/20" : ""} />
          </div>
          {ENABLE_CONTRIBUTE_POINTS && (
            <div className={`mt-3 border-t pt-2.5 ${tone === "dark" ? "border-white/10" : "border-stone-100"}`}>
              <p className={`mb-1 text-[12px] font-semibold ${tone === "dark" ? "text-white/85" : "text-stone-700"}`}>
                {t.settingsPoints}
              </p>
              <PointsBadge
                variant="menu"
                className={tone === "dark" ? "text-amber-100 hover:bg-white/10" : ""}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
