import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "풍경너머",
  description: "떠나기 전에 먼저 가보는 여행. 로드뷰와 그 장소의 소리로 떠나는 가상여행.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
