import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/i18n/locale";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/dictionaries";
import "./globals.css";

export const metadata: Metadata = {
  title: "풍경너머",
  description: "여행지를 지도에 모으고, 블로그·후기는 원문으로 연결하는 사전 조사 지도.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  const initialLocale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  return (
    <html lang={initialLocale === "ko" ? "ko" : "en"} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
