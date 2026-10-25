import { fallbackProvider } from "./fallback";
import { googleProvider } from "./google";
import { kakaoProvider } from "./kakao";
import type { RoadviewProvider } from "./types";

export * from "./types";
export { fallbackProvider };

export function providerFor(country: string): RoadviewProvider {
  return country === "KR" ? kakaoProvider : googleProvider;
}
