import { Gowun_Dodum, IBM_Plex_Sans_KR } from "next/font/google";

/** Readable UI sans — clean Korean metrics, soft enough for travel. */
export const fontSans = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex",
});

/** Soft display — rounded, warm tone for titles. */
export const fontDisplay = Gowun_Dodum({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-gowun",
});
