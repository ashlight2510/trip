"use client";

import { useState, useTransition } from "react";
import { likePlace } from "@/app/actions/like-place";

export function PlaceLikeControls({
  placeId,
  likeCount = 0,
  onLiked,
}: {
  placeId: string;
  likeCount?: number;
  onLiked?: (likes: number) => void | Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [likes, setLikes] = useState(likeCount);
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (pending) return;
    start(async () => {
      try {
        const res = await likePlace({ place_id: placeId });
        setLikes(res.likes);
        setLiked(res.liked);
        setError(null);
        await onLiked?.(res.likes);
      } catch {
        setError("좋아요 실패");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 transition disabled:opacity-40 ${
          liked
            ? "bg-rose-50 text-rose-700 ring-rose-200"
            : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
        }`}
        aria-pressed={liked}
        aria-label={liked ? "좋아요 취소" : "좋아요"}
        title={liked ? "좋아요 취소" : "좋아요 · 지도 순위에 조금 반영돼요"}
      >
        <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
          <path
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            d="M12 20s-7-4.35-7-9.2A3.8 3.8 0 0 1 12 7.5a3.8 3.8 0 0 1 7 3.3C19 15.65 12 20 12 20z"
          />
        </svg>
        <span className="tabular-nums">{likes}</span>
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
