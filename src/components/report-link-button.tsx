"use client";

import { useState, useTransition } from "react";
import { reportSource } from "@/app/actions/report-source";
import { ENABLE_COMMUNITY_WRITES } from "@/lib/features";

export function ReportLinkButton({
  placeId,
  sourceId,
  sourceUrl,
}: {
  placeId: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
}) {
  if (!ENABLE_COMMUNITY_WRITES) return null;

  return (
    <ReportLinkButtonActive placeId={placeId} sourceId={sourceId} sourceUrl={sourceUrl} />
  );
}

function ReportLinkButtonActive({
  placeId,
  sourceId,
  sourceUrl,
}: {
  placeId: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (done || pending) return;
    start(async () => {
      try {
        await reportSource({
          place_id: placeId,
          source_id: sourceId ?? null,
          source_url: sourceUrl ?? null,
          reason: "deleted",
          note: null,
        });
        setDone(true);
        setError(null);
      } catch {
        setError("제보에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  if (done) {
    return <span className="text-[11px] text-stone-500">제보 완료 · 확인 후 연결을 정리할게요</span>;
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="text-[11px] text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline disabled:opacity-50"
      >
        {pending ? "제보 중…" : "원문 없음 · 삭제됨 제보"}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
