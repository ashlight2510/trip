"use client";

import { useState, useTransition } from "react";
import { rankSource } from "@/app/actions/rank-source";
import { ENABLE_COMMUNITY_WRITES } from "@/lib/features";

export function SourceRankControls({
  placeId,
  sourceId,
  boost,
  canUp,
  canDown,
  onRanked,
}: {
  placeId: string;
  sourceId: string;
  boost: number;
  canUp: boolean;
  canDown: boolean;
  onRanked?: () => void | Promise<void>;
}) {
  if (!ENABLE_COMMUNITY_WRITES) return null;

  return (
    <SourceRankControlsActive
      placeId={placeId}
      sourceId={sourceId}
      boost={boost}
      canUp={canUp}
      canDown={canDown}
      onRanked={onRanked}
    />
  );
}

function SourceRankControlsActive({
  placeId,
  sourceId,
  boost,
  canUp,
  canDown,
  onRanked,
}: {
  placeId: string;
  sourceId: string;
  boost: number;
  canUp: boolean;
  canDown: boolean;
  onRanked?: () => void | Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(direction: "up" | "down") {
    if (pending) return;
    if (direction === "up" && !canUp) return;
    if (direction === "down" && !canDown) return;
    start(async () => {
      try {
        await rankSource({ place_id: placeId, source_id: sourceId, direction });
        setError(null);
        await onRanked?.();
      } catch {
        setError("순위 변경 실패");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={!canUp || pending}
        onClick={() => move("up")}
        className="rounded-md px-1.5 py-0.5 text-[11px] text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="순위 올리기"
        title="올리기"
      >
        ▲
      </button>
      <button
        type="button"
        disabled={!canDown || pending}
        onClick={() => move("down")}
        className="rounded-md px-1.5 py-0.5 text-[11px] text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="순위 내리기"
        title="내리기"
      >
        ▼
      </button>
      {boost !== 0 && (
        <span className="ml-1 text-[10px] tabular-nums text-stone-400">
          {boost > 0 ? `+${boost}` : boost}
        </span>
      )}
      {error && <span className="ml-1 text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
