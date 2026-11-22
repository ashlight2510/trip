import { track } from "@/lib/track";

export async function shareOrCopy(input: {
  title: string;
  text: string;
  url: string;
  event?: string;
  eventProps?: Record<string, string | number | boolean | null | undefined>;
}): Promise<"shared" | "copied" | "failed"> {
  const { title, text, url, event = "share", eventProps } = input;
  track(event, { method: "attempt", ...eventProps });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, text, url });
      track(event, { method: "native", ...eventProps });
      return "shared";
    }
  } catch (err) {
    // User cancel — don't fall through as failure noise.
    if (err instanceof DOMException && err.name === "AbortError") return "failed";
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`.trim());
    track(event, { method: "clipboard", ...eventProps });
    return "copied";
  } catch {
    track(event, { method: "failed", ...eventProps });
    return "failed";
  }
}
