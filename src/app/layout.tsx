import type { Metadata, Viewport } from "next";
import { LocaleProvider } from "@/i18n/locale";
import { fontDisplay, fontOutfit, fontSans, fontTicket, fontTicketDisplay } from "./fonts";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://trip.funnyfunny.cloud";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "풍경너머 — 여행 후기를 지도에서 미리 보기",
    template: "%s · 풍경너머",
  },
  description:
    "가기 전에 지도·블로그·유튜브 후기를 한곳에서. 내 주변·서울부터 하루 코스까지, 풍경너머에서 미리 걸어 보세요.",
  applicationName: "풍경너머",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE,
    siteName: "풍경너머",
    title: "풍경너머 — 여행 후기를 지도에서 미리 보기",
    description:
      "가기 전에 지도·블로그·유튜브 후기를 한곳에서. 내 주변부터 하루 코스까지.",
    images: [{ url: "/logo-brand.png", width: 512, height: 512, alt: "풍경너머" }],
  },
  twitter: {
    card: "summary",
    title: "풍경너머 — 여행 후기를 지도에서 미리 보기",
    description: "가기 전에 지도·후기로 미리 걸어 보기.",
    images: ["/logo-brand.png"],
  },
  alternates: { canonical: SITE },
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
