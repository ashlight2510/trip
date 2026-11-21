import type { Metadata, Viewport } from "next";
import { LocaleProvider } from "@/i18n/locale";
import { fontDisplay, fontOutfit, fontSans, fontTicket, fontTicketDisplay } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "풍경너머",
  description: "여행지를 지도에 모으고, 블로그·후기는 원문으로 연결하는 사전 조사 지도.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`h-full antialiased ${fontSans.variable} ${fontDisplay.variable} ${fontTicketDisplay.variable} ${fontTicket.variable} ${fontOutfit.variable}`}
    >
      <body className={`${fontSans.className} flex min-h-full flex-col`}>
        {/* Thin candy awning along the very top — decorative only, never intercepts map drags. */}
        <div aria-hidden className="ticket-awning pointer-events-none fixed inset-x-0 top-0 z-[1000] h-[6px]" />
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
