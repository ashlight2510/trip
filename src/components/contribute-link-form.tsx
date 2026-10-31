"use client";

import { useEffect, useState, useTransition } from "react";
import { contributeSource, getMyPoints } from "@/app/actions/contribute-source";
import { notifyPointsUpdated } from "@/components/points-badge";

export { PointsBadge } from "@/components/points-badge";

export function ContributeLinkForm({
  placeId,
  onLinked,
  tone = "light",
}: {
  placeId: string;
  onLinked?: () => void | Promise<void>;
  tone?: "light" | "dark";
}) {
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const dark = tone === "dark";

  useEffect(() => {
    void getMyPoints().then((r) => setPoints(r.points));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !url.trim()) return;
    setMsg(null);
    setErr(null);
    start(async () => {
      try {
        const res = await contributeSource({ place_id: placeId, url: url.trim() });
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        setMsg(res.message);
        setPoints(res.points_total);
        notifyPointsUpdated(res.points_total);
        setUrl("");
        await onLinked?.();
      } catch {
        setErr("연결에 실패했어요. URL을 확인한 뒤 다시 시도해 주세요.");
      }
    });
  }

  return (
    <div
      className={`mt-3 rounded-xl border border-dashed p-3 ${
        dark ? "border-white/25 bg-white/10" : "border-[#1b4965]/25 bg-[#1b4965]/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-xs font-semibold ${dark ? "text-white" : "text-[#1b4965]"}`}>후기 직접 연결하기</p>
          <p className={`mt-0.5 text-[11px] leading-snug ${dark ? "text-white/65" : "text-stone-500"}`}>
            블로그·유튜브 링크를 붙이면 포인트가 쌓여요. 나중에 풍경너머에서 쓸 수 있어요.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-amber-900">
          {points.toLocaleString("ko-KR")}P
        </span>
      </div>
      <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://blog.naver.com/… 또는 YouTube"
          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 disabled:opacity-50 ${
            dark
              ? "border-white/20 bg-black/30 text-white ring-white/30 placeholder:text-white/40"
              : "border-stone-200 bg-white text-stone-800 ring-[#1b4965]/30 placeholder:text-stone-400"
          }`}
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !url.trim()}
          className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40 ${
            dark ? "bg-amber-300 text-black hover:bg-amber-200" : "bg-[#1b4965] text-white hover:bg-[#163a52]"
          }`}
        >
          {pending ? "연결 중…" : "연결하고 포인트 받기"}
        </button>
      </form>
      {msg && (
        <p className={`mt-2 text-[11px] leading-snug ${dark ? "text-emerald-300" : "text-emerald-700"}`}>{msg}</p>
      )}
      {err && <p className={`mt-2 text-[11px] leading-snug ${dark ? "text-red-300" : "text-red-600"}`}>{err}</p>}
    </div>
  );
}
