"use client";

import { useEffect, useRef } from "react";
import type { Stop } from "@/data/courses";
import {
  PanoramaNotFoundError,
  fallbackProvider,
  providerFor,
  type RoadviewHandle,
  type RoadviewProvider,
} from "@/lib/roadview";

export type StageNotice = "key-missing" | "no-pano" | "load-failed";

export interface StageInfo {
  handle: RoadviewHandle;
  provider: RoadviewProvider;
  notice: StageNotice | null;
}

interface Props {
  stop: Stop;
  onReady: (info: StageInfo) => void;
  onHeading: (deg: number) => void;
}

export function RoadviewStage({ stop, onReady, onHeading }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onHeading });
  useEffect(() => {
    callbacks.current = { onReady, onHeading };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const el = document.createElement("div");
    el.style.cssText = "position:absolute;inset:0;";
    host.appendChild(el);

    let cancelled = false;
    let handle: RoadviewHandle | null = null;
    let unsubscribe: (() => void) | null = null;

    const target = {
      lat: stop.lat,
      lng: stop.lng,
      heading: stop.heading,
      palette: stop.palette,
      landmarks: stop.soundscape.flatMap((l) =>
        l.bearing !== undefined && l.label ? [{ bearing: l.bearing, label: l.label }] : [],
      ),
    };

    (async () => {
      let provider = providerFor(stop.country);
      let notice: StageNotice | null = null;

      if (!provider.isConfigured()) {
        provider = fallbackProvider;
        notice = "key-missing";
      }
      try {
        handle = await provider.mount(el, target);
      } catch (e) {
        if (cancelled) return;
        notice = e instanceof PanoramaNotFoundError ? "no-pano" : "load-failed";
        provider = fallbackProvider;
        el.innerHTML = "";
        handle = await provider.mount(el, target);
      }

      if (cancelled) {
        handle.destroy();
        return;
      }
      unsubscribe = handle.onHeadingChange((deg) => callbacks.current.onHeading(deg));
      callbacks.current.onReady({ handle, provider, notice });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      handle?.destroy();
      el.remove();
    };
  }, [stop]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
