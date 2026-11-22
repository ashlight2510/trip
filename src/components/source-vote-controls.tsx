"use client";

import { useState, useTransition } from "react";
import { voteSource } from "@/app/actions/vote-source";
import { ENABLE_COMMUNITY_WRITES } from "@/lib/features";

export function SourceVoteControls({
  placeId,
  sourceId,
  communityScore = 0,
  onVoted,
}: {
  placeId: string;
  sourceId: string;
  communityScore?: number;
  onVoted?: () => void | Promise<void>;
}) {
  if (!ENABLE_COMMUNITY_WRITES) return null;

  return (
    <SourceVoteControlsActive
      placeId={placeId}
      sourceId={sourceId}
      communityScore={communityScore}
      onVoted={onVoted}
    />
  );
}

function SourceVoteControlsActive({
  placeId,
  sourceId,
  communityScore = 0,
  onVoted,
}: {
  placeId: string;
  sourceId: string;
  communityScore?: number;
  onVoted?: () => void | Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [score, setScore] = useState(communityScore);
  const [mine, setMine] = useState<1 | -1 | 0>(0);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function vote(value: 1 | -1) {
    if (pending) return;
    start(async () => {
      try {
        const res = await voteSource({ place_id: placeId, source_id: sourceId, value });
        setScore(res.score);
        setMine(res.my_vote);
        setError(null);
        setHint(
          res.hidden
            ? `점수 ${res.score} · ${res.hide_at} 이하면 목록에서 숨겨져요`
            : null,
        );
        await onVoted?.();
      } catch {
        setError("투표 실패");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => vote(1)}
        className={`rounded-md px-1.5 py-0.5 text-[11px] ring-1 disabled:opacity-40 ${
          mine === 1
            ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
            : "text-stone-600 ring-stone-200 hover:bg-stone-50"
        }`}
        aria-label="좋은 후기"
        title="좋은 후기 +"
      >
        +
      </button>
      <span className="min-w-[1.5rem] text-center text-[10px] tabular-nums text-stone-500">
        {score > 0 ? `+${score}` : score}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => vote(-1)}
        className={`rounded-md px-1.5 py-0.5 text-[11px] ring-1 disabled:opacity-40 ${
          mine === -1
            ? "bg-rose-100 text-rose-800 ring-rose-300"
            : "text-stone-600 ring-stone-200 hover:bg-stone-50"
        }`}
        aria-label="별로인 후기"
        title="별로 − (너무 낮으면 숨김)"
      >
        −
      </button>
      {hint && <span className="text-[10px] text-amber-700">{hint}</span>}
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
