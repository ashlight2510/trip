"use client";

import { useEffect, useState, useTransition } from "react";
import { getMyList, togglePlaceInMyList } from "@/app/actions/place-list";
import { ENABLE_COMMUNITY_WRITES } from "@/lib/features";

export function PlaceListControls({
  placeId,
}: {
  placeId: string;
}) {
  if (!ENABLE_COMMUNITY_WRITES) return null;

  return <PlaceListControlsActive placeId={placeId} />;
}

function PlaceListControlsActive({
  placeId,
}: {
  placeId: string;
}) {
  const [pending, start] = useTransition();
  const [inList, setInList] = useState(false);
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getMyList()
      .then((snap) => {
        if (!alive) return;
        setInList(snap.place_ids.includes(placeId));
        setCount(snap.count);
        setReady(true);
      })
      .catch(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [placeId]);

  function toggle() {
    if (pending) return;
    start(async () => {
      try {
        const res = await togglePlaceInMyList({ place_id: placeId });
        setInList(res.in_list);
        setCount(res.count);
        setError(null);
      } catch {
        setError("리스트 저장 실패");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending || !ready}
        onClick={toggle}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 transition disabled:opacity-40 ${
          inList
            ? "bg-sky-50 text-sky-800 ring-sky-200"
            : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
        }`}
        aria-pressed={inList}
        title={inList ? "내 리스트에서 빼기" : "내 리스트에 담기"}
      >
        <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
          <path
            fill={inList ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            d="M6 4h12a1 1 0 0 1 1 1v16l-7-3.5L5 21V5a1 1 0 0 1 1-1z"
          />
        </svg>
        {inList ? "담김" : "담기"}
        {ready && <span className="tabular-nums text-[10px] opacity-70">{count}</span>}
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
