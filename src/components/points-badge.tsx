"use client";

import { useEffect, useState } from "react";
import { getMyPoints } from "@/app/actions/contribute-source";

export const POINTS_UPDATED_EVENT = "pn:points-updated";

export function notifyPointsUpdated(points?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(POINTS_UPDATED_EVENT, { detail: { points } }),
  );
}

export function PointsBadge({ className = "" }: { className?: string }) {
  const [points, setPoints] = useState(0);
  const [linked, setLinked] = useState(0);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getMyPoints().then((r) => {
      if (cancelled) return;
      setPoints(r.points);
      setLinked(r.linked_count);
      setReady(true);
    });
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ points?: number }>).detail;
      if (typeof detail?.points === "number") {
        setPoints(detail.points);
        setReady(true);
        return;
      }
      void getMyPoints().then((r) => {
        setPoints(r.points);
        setLinked(r.linked_count);
        setReady(true);
      });
    };
    window.addEventListener(POINTS_UPDATED_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(POINTS_UPDATED_EVENT, onUpdate);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-[13px] font-semibold text-amber-900 ring-1 ring-amber-200/80 transition hover:bg-amber-200/80 ${className}`}
        aria-label={`내 포인트 ${points}점. 상세 보기`}
      >
        <span aria-hidden>✦</span>
        <span className="tabular-nums">{ready ? points.toLocaleString("ko-KR") : "—"}P</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="닫기"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 m-3 w-[min(100%,22rem)] rounded-2xl bg-[var(--background-panel)] p-5 shadow-2xl ring-1 ring-[var(--border-soft)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-stone-500">풍경너머</p>
                <h2 className="font-display mt-1 text-lg text-stone-900">내 포인트</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-1 text-sm text-stone-500 hover:bg-stone-200/60"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <p className="mt-4 text-4xl font-bold tabular-nums tracking-tight text-amber-800">
              {points.toLocaleString("ko-KR")}
              <span className="ml-1 text-base font-semibold text-amber-700/80">P</span>
            </p>
            <p className="mt-1 text-xs text-stone-500">
              후기 연결 {linked.toLocaleString("ko-KR")}회 · 익명으로 이 브라우저에 쌓여요
            </p>

            <div className="mt-5 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/80 px-3.5 py-3">
              <p className="text-xs font-semibold text-amber-950">쓰임은 곧 공개</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-amber-950/75">
                지금은 모으기만 됩니다. 포인트로 무엇을 할 수 있는지는 나중에 풍경너머에서
                알려드릴게요. 후기를 연결하거나 좋은 링크에 참여하면 계속 쌓입니다.
              </p>
            </div>

            <ul className="mt-4 space-y-1.5 text-[11px] text-stone-600">
              <li>· 새 후기 연결 +15P</li>
              <li>· 이미 있는 링크 참여 +2P</li>
              <li>· 자리 가득 대기열 +5P</li>
            </ul>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl bg-[#1b4965] py-2.5 text-sm font-semibold text-white hover:bg-[#163a52]"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
