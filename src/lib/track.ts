type TrackProps = Record<string, string | number | boolean | null | undefined>;

/** Lightweight product analytics — Amplitude if present, else no-op. */
export function track(event: string, props?: TrackProps) {
  if (typeof window === "undefined") return;
  try {
    const amp = (window as unknown as { amplitude?: { track?: (e: string, p?: TrackProps) => void } })
      .amplitude;
    amp?.track?.(event, props);
  } catch {
    /* ignore */
  }
  try {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.("event", event, props);
  } catch {
    /* ignore */
  }
}
