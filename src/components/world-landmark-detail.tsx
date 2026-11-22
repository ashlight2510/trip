"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { WorldLandmark } from "@/lib/world-landmarks-200";

const REGION_BADGE: Record<string, string> = {
  유럽: "bg-sky-900/10 text-sky-950 ring-sky-900/20",
  아시아: "bg-rose-900/10 text-rose-950 ring-rose-900/20",
  아메리카: "bg-amber-900/10 text-amber-950 ring-amber-900/25",
  아프리카: "bg-emerald-900/10 text-emerald-950 ring-emerald-900/20",
  오세아니아: "bg-teal-900/10 text-teal-950 ring-teal-900/20",
  중동: "bg-orange-900/10 text-orange-950 ring-orange-900/20",
};

function LandmarkHeroArt({ landmark }: { landmark: WorldLandmark }) {
  const [src, setSrc] = useState(landmark.image);
  const isSvg = src.endsWith(".svg");

  useEffect(() => {
    setSrc(landmark.image);
  }, [landmark.image, landmark.id]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-stone-200 shadow-sm ring-1 ring-black/10">
      {isSvg ? (
        // SVG posters are static files in /public — use img for reliable vector rendering.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={landmark.imageAlt}
          className="absolute inset-0 size-full object-cover"
          onError={() => {
            const fallback = landmark.image.replace(/\.jpg$/, ".svg");
            if (fallback !== src) setSrc(fallback);
          }}
        />
      ) : (
        <Image
          src={src}
          alt={landmark.imageAlt}
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover"
          onError={() => {
            const fallback = landmark.image.replace(/\.jpg$/, ".svg");
            if (fallback !== src) setSrc(fallback);
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent p-4 pt-16">
        <p className="font-display text-xl leading-tight text-white drop-shadow sm:text-2xl">{landmark.name}</p>
        <p className="mt-0.5 text-xs text-white/85">{landmark.country}</p>
      </div>
    </div>
  );
}

export function WorldLandmarkDetail({
  landmark,
  onClose,
  onPrev,
  onNext,
}: {
  landmark: WorldLandmark;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${landmark.name} 소개`}
      className="fixed inset-0 z-[6000] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-[#f7f2e9] text-[#1f2933] shadow-2xl ring-1 ring-black/10 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-200/80 bg-white/70 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#1b4965]">
              풍경너머 · WORLD LANDMARK
            </p>
            <p className="truncate text-sm font-bold text-stone-900">
              {landmark.name}
              <span className="ml-2 font-medium text-stone-500">{landmark.country}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
              >
                ← 이전
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
              >
                다음 →
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid lg:grid-cols-12">
            <div className="flex flex-col gap-4 bg-[#f1eadc]/65 p-4 sm:p-5 lg:col-span-5">
              <LandmarkHeroArt landmark={landmark} />
              <p className="px-1 text-xs leading-relaxed text-stone-600">
                {landmark.imageAlt}
                {landmark.note ? ` · ${landmark.note}` : ""}
              </p>
              <div className="rounded-2xl bg-[#8b2635]/[0.06] p-3.5 ring-1 ring-[#8b2635]/15">
                <p className="text-[11px] font-bold tracking-wide text-[#8b2635]">
                  알고 보면 더 재밌는 포인트
                </p>
                <p className="mt-1 text-xs leading-relaxed text-stone-700">{landmark.funFact}</p>
              </div>
            </div>

            <div className="p-5 sm:p-7 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${REGION_BADGE[landmark.region] ?? REGION_BADGE.유럽}`}
                >
                  {landmark.region}
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200/80">
                  방문 추천 · {landmark.bestSeason}
                </span>
              </div>

              <h2 className="font-display mt-3 text-2xl text-stone-900 sm:text-3xl">{landmark.name}</h2>
              <p className="mt-1 text-base font-semibold text-[#1b4965]">{landmark.headline}</p>
              <p className="mt-2.5 text-sm leading-relaxed text-stone-700">{landmark.summary}</p>

              <div className="mt-6 space-y-5">
                <section aria-label="여기서 해볼 것">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-2 rounded-full bg-[#8b2635]" aria-hidden />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b2635]">
                      여기서 해볼 것 · 체험 &amp; 팁
                    </h3>
                  </div>
                  <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                    {landmark.experiences.map((item) => (
                      <li
                        key={item.name}
                        className="rounded-2xl bg-[#fbf8f3] p-3.5 ring-1 ring-stone-200/80"
                      >
                        <p className="text-sm font-bold text-stone-900">{item.name}</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{item.description}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section aria-label="이야기와 이벤트">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-2 rounded-full bg-[#1b4965]" aria-hidden />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b4965]">
                      이야기와 역사 · 특별 포인트
                    </h3>
                  </div>
                  <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    {landmark.stories.map((ev) => (
                      <li
                        key={ev.name}
                        className="rounded-2xl bg-[#f3f7fa] p-3.5 ring-1 ring-sky-900/10"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-1.5">
                          <p className="text-sm font-bold text-stone-900">{ev.name}</p>
                          <span className="text-[11px] font-semibold text-[#1b4965]">{ev.dateHint}</span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{ev.description}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
