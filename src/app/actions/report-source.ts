import { STATIC_UNAVAILABLE } from "@/lib/static-unavailable";

export async function reportSource(_raw: unknown) {
  throw new Error(STATIC_UNAVAILABLE);
}
