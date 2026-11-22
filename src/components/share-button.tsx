"use client";

import { useState } from "react";
import { shareOrCopy } from "@/lib/share";

export function ShareButton({
  title,
  text,
  url,
  event = "share",
  eventProps,
  className = "",
  label = "공유",
  copiedLabel = "복사됨",
  compact = false,
}: {
  title: string;
  text: string;
  url: string;
  event?: string;
  eventProps?: Record<string, string | number | boolean | null | undefined>;
  className?: string;
  label?: string;
  copiedLabel?: string;
  compact?: boolean;
}) {
  const [flash, setFlash] = useState<"idle" | "ok" | "fail">("idle");

  async function onShare() {
    const result = await shareOrCopy({ title, text, url, event, eventProps });
    setFlash(result === "failed" ? "fail" : "ok");
    window.setTimeout(() => setFlash("idle"), 1600);
  }

  const shown =
    flash === "ok" ? copiedLabel : flash === "fail" ? "실패" : label;

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      className={
        className ||
        (compact
          ? "inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1b4965] ring-1 ring-sky-200 hover:bg-sky-50"
          : "inline-flex items-center gap-1.5 rounded-full bg-[#1b4965] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-[#163a52]")
      }
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.3 3.3 0 0 0 0-1.39l7.02-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-2.83 2.92L11.15 12l7.02 4.11c.5-.46 1.14-.73 1.83-.73A3 3 0 1 1 18 16.08z"
        />
      </svg>
      {shown}
    </button>
  );
}
