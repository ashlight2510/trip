"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  getMyList,
  togglePlaceInMyList,
  updateMyList,
  type MyListSnapshot,
} from "@/app/actions/place-list";
import { categoryColor } from "@/lib/categories";

type PlaceRow = {
  id: string;
  name: string;
  category: string;
  city_name: string | null;
  district_name: string | null;
  source_count: number;
  like_count: number;
};

export function MyListClient({ initialPlaces }: { initialPlaces: PlaceRow[] }) {
  const [pending, start] = useTransition();
  const [snap, setSnap] = useState<MyListSnapshot | null>(null);
  const [title, setTitle] = useState("내 리스트");
  const [places, setPlaces] = useState(initialPlaces);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getMyList()
      .then((s) => {
        setSnap(s);
        setTitle(s.list.title);
      })
      .catch(() => setError("리스트를 불러오지 못했어요"));
  }, []);

  function saveTitle() {
    start(async () => {
      try {
        const next = await updateMyList({ title: title.trim() || "내 리스트" });
        setSnap(next);
        setTitle(next.list.title);
        setError(null);
      } catch {
        setError("제목 저장 실패");
      }
    });
  }

  function setPublic(is_public: boolean) {
    start(async () => {
      try {
        const next = await updateMyList({ is_public });
        setSnap(next);
        setError(null);
      } catch {
        setError("공유 설정 실패");
      }
    });
  }

  function remove(placeId: string) {
    start(async () => {
      try {
        const next = await togglePlaceInMyList({ place_id: placeId });
        setSnap(next);
        setPlaces((prev) => prev.filter((p) => p.id !== placeId));
        setError(null);
      } catch {
        setError("삭제 실패");
      }
    });
  }

  async function copyShare() {
    if (!snap) return;
    const url = `${window.location.origin}${snap.list.share_path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("링크 복사 실패");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-stone-200/80">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          리스트 이름
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
          />
          <button
            type="button"
            disabled={pending}
            onClick={saveTitle}
            className="rounded-xl bg-stone-900 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
          >
            저장
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending || !snap}
            onClick={() => setPublic(!(snap?.list.is_public ?? false))}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 disabled:opacity-40 ${
              snap?.list.is_public
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-white text-stone-600 ring-stone-200"
            }`}
          >
            {snap?.list.is_public ? "공유 중" : "비공개"}
          </button>
          {snap?.list.is_public && (
            <button
              type="button"
              onClick={() => void copyShare()}
              className="rounded-full bg-stone-900 px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              {copied ? "복사됨" : "공유 링크 복사"}
            </button>
          )}
          {snap?.list.is_public && (
            <Link
              href={snap.list.share_path}
              className="text-[12px] font-medium text-sky-700 underline-offset-2 hover:underline"
            >
              {snap.list.share_path}
            </Link>
          )}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
          공유를 켜면 링크를 아는 사람이 이 리스트를 볼 수 있어요. 끄면 나만 볼 수 있습니다.
        </p>
        {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
      </div>

      <section>
        <h2 className="text-sm font-semibold text-stone-700">
          담은 장소 <span className="tabular-nums text-stone-400">{places.length}</span>
        </h2>
        {places.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            지도에서 장소를 열고 「담기」를 누르면 여기에 쌓여요.{" "}
            <Link href="/" className="font-semibold text-sky-700 underline-offset-2 hover:underline">
              지도로 가기
            </Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {places.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl bg-white/85 p-3 ring-1 ring-stone-200/80"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: categoryColor[p.category as keyof typeof categoryColor] ?? "#78716c" }}
                />
                <div className="min-w-0 flex-1">
                  <Link href={`/?q=${encodeURIComponent(p.name)}`} className="block truncate text-sm font-semibold text-stone-900 hover:opacity-80">
                    {p.name}
                  </Link>
                  <p className="text-[11px] text-stone-400">
                    {[p.city_name, p.district_name].filter(Boolean).join(" · ")}
                    {` · 후기 ${p.source_count}`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(p.id)}
                  className="rounded-full px-2 py-1 text-[11px] text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-40"
                >
                  빼기
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
