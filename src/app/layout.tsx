import type { Metadata, Viewport } from "next";
import { LocaleProvider } from "@/i18n/locale";
import { fontDisplay, fontSans } from "./fonts";
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
    <html lang="ko" className={`h-full antialiased ${fontSans.variable} ${fontDisplay.variable}`}>
      <body className={`${fontSans.className} flex min-h-full flex-col`}>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
