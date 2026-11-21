import { Black_Han_Sans, Gowun_Dodum, IBM_Plex_Sans_KR, Jua, Outfit } from "next/font/google";

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

/** FunnyFunny Candy Ticket Booth — heavy display for the wordmark only. */
export const fontTicketDisplay = Black_Han_Sans({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-black-han",
});

/** FunnyFunny Candy Ticket Booth — rounded chrome labels / ticket stubs. */
export const fontTicket = Jua({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-jua",
});

/** Latin chrome text (FUNNYFUNNY wordmark, numerals on tickets). */
export const fontOutfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-outfit",
});
