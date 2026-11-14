"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CHRISTMAS_REGIONS,
  CHRISTMAS_TIMELINE,
  WORLD_CHRISTMAS_COUNTRIES,
  type ChristmasRegion,
  type CountryChristmas,
} from "@/lib/world-christmas";

type FocusMode = "all" | "food" | "event";

const REGION_BADGE_STYLE: Record<ChristmasRegion, string> = {
  유럽: "bg-sky-900/10 text-sky-950 ring-sky-900/20",
  아시아: "bg-rose-900/10 text-rose-950 ring-rose-900/20",
  아메리카: "bg-amber-900/10 text-amber-950 ring-amber-900/25",
  아프리카: "bg-emerald-900/10 text-emerald-950 ring-emerald-900/20",
  오세아니아: "bg-teal-900/10 text-teal-950 ring-teal-900/20",
};

function matchesQuery(country: CountryChristmas, raw: string) {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    country.nameKo,
    country.nameEn,
    country.region,
    country.greeting,
    country.headline,
    country.summary,
    country.funFact,
    ...country.foods.flatMap((f) => [f.name, f.localName ?? "", f.description]),
    ...country.events.flatMap((e) => [e.name, e.dateHint, e.description]),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function WorldChristmasAtlas() {
  const [region, setRegion] = useState<ChristmasRegion | "전체">("전체");
  const [focus, setFocus] = useState<FocusMode>("all");
  const [query, setQuery] = useState("");
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const regionCounts = useMemo(() => {
    const counts = new Map<ChristmasRegion, number>();
    for (const c of WORLD_CHRISTMAS_COUNTRIES) {
      counts.set(c.region, (counts.get(c.region) ?? 0) + 1);
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    return WORLD_CHRISTMAS_COUNTRIES.filter((c) => {
      if (region !== "전체" && c.region !== region) return false;
      return matchesQuery(c, query);
    });
  }, [region, query]);

  const lightboxIndex = useMemo(
    () => (lightboxId ? filtered.findIndex((c) => c.id === lightboxId) : -1),
    [filtered, lightboxId],
  );
  const lightboxCountry = lightboxIndex >= 0 ? filtered[lightboxIndex] : null;

  useEffect(() => {
    if (!lightboxCountry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxId(null);
      } else if (e.key === "ArrowRight") {
        const next = filtered[(lightboxIndex + 1) % filtered.length];
        if (next) setLightboxId(next.id);
      } else if (e.key === "ArrowLeft") {
        const prev = filtered[(lightboxIndex - 1 + filtered.length) % filtered.length];
        if (prev) setLightboxId(prev.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxCountry, lightboxIndex, filtered]);

  return (
    <main className="min-h-dvh bg-[#f7f2e9] text-[#1f2933]">
      {/* Top atmospheric backdrop */}
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 85% 45% at 15% 0%, rgba(27,73,101,0.10) 0%, transparent 60%), radial-gradient(ellipse 70% 45% at 90% 5%, rgba(164,56,48,0.08) 0%, transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {/* Top Navigation */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.26em] text-[#1b4965]">풍경너머 · WORLD CULTURE ATLAS</p>
            <p className="mt-0.5 text-xs text-stone-600">전 세계 연말의 식탁과 축제를 그림과 이야기로 묶은 아카이브</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2" aria-label="페이지 이동">
            <Link
              href="/picks"
              className="rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-300/80 transition hover:bg-white"
            >
              픽
            </Link>
            <Link
              href="/vlog"
              className="rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-300/80 transition hover:bg-white"
            >
              브이로그
            </Link>
            <Link
              href="/"
              className="rounded-full bg-[#1b4965] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#153a50]"
            >
              지도로 돌아가기
            </Link>
          </nav>
        </header>

        {/* Hero Banner */}
        <section className="mt-5 overflow-hidden rounded-3xl bg-[#13293d] text-white shadow-xl ring-1 ring-black/10">
          <div className="grid lg:grid-cols-12">
            <div className="relative aspect-[16/10] w-full lg:col-span-7 lg:aspect-auto lg:min-h-[340px]">
              <Image
                src="/christmas/christmas-hero.jpg"
                alt="유럽의 눈 덮인 크리스마스 마켓, 호주의 여름 해변, 멕시코와 필리핀의 별 등불이 어우러진 세계 크리스마스 일러스트"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#13293d]/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#13293d]/95" />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:col-span-5 lg:py-10 lg:pl-4 lg:pr-9">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-300/15 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-200 ring-1 ring-amber-200/30">
                12개국 그림 도감 · 음식과 이벤트
              </span>
              <h1 className="font-display mt-3 text-3xl leading-tight text-[#fffaf2] sm:text-4xl">
                전 세계의 크리스마스 문화
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-200/90">
                눈 내리는 광장에서 럼 설탕을 태워 마시는 독일의 겨울밤부터, 30℃ 바다에서 산타 모자를 쓰고 서핑하는 호주의
                한여름, 1월 7일에 새벽 촛불을 밝히는 에티오피아까지. 12개 나라의 대표 음식과 이벤트를 삽화와 함께
                모았습니다.
              </p>
              <dl className="mt-6 grid grid-cols-3 gap-2.5 border-t border-white/15 pt-4 text-center">
                <div className="rounded-2xl bg-white/[0.06] px-2 py-2.5">
                  <dt className="text-[11px] text-slate-300">소개 국가</dt>
                  <dd className="font-display mt-0.5 text-xl text-amber-200">12개국</dd>
                </div>
                <div className="rounded-2xl bg-white/[0.06] px-2 py-2.5">
                  <dt className="text-[11px] text-slate-300">음식·디저트</dt>
                  <dd className="font-display mt-0.5 text-xl text-amber-200">36선</dd>
                </div>
                <div className="rounded-2xl bg-white/[0.06] px-2 py-2.5">
                  <dt className="text-[11px] text-slate-300">시즌 기간</dt>
                  <dd className="font-display mt-0.5 text-xl text-amber-200">9월~1월</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <section
          aria-label="필터 및 검색"
          className="mt-6 rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-stone-200/90 backdrop-blur"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Region Filter */}
            <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="대륙별 필터">
              <button
                type="button"
                onClick={() => setRegion("전체")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  region === "전체"
                    ? "bg-[#1b4965] text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200/80"
                }`}
              >
                전체 {WORLD_CHRISTMAS_COUNTRIES.length}
              </button>
              {CHRISTMAS_REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(region === r ? "전체" : r)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    region === r
                      ? "bg-[#1b4965] text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200/80"
                  }`}
                >
                  {r} {regionCounts.get(r) ?? 0}
                </button>
              ))}
            </div>

            {/* Focus Mode + Search */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div
                className="inline-flex rounded-full bg-stone-100 p-0.5 text-xs font-semibold"
                role="group"
                aria-label="보기 방식"
              >
                {(
                  [
                    ["all", "음식+이벤트"],
                    ["food", "음식 중심"],
                    ["event", "이벤트 중심"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFocus(key)}
                    className={`rounded-full px-3 py-1 transition ${
                      focus === key ? "bg-[#8b2635] text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="나라·음식·풍습 검색 (예: 슈톨렌, 마켓, 1월)"
                  aria-label="크리스마스 문화 검색"
                  className="w-full rounded-full border border-stone-300 bg-white py-1.5 pl-3.5 pr-8 text-xs text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1b4965] focus:ring-2 focus:ring-[#1b4965]/20 sm:w-64"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="검색어 지우기"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Country Quick Jump Pills */}
          {filtered.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-stone-200/80 pt-3">
              <span className="mr-1 text-[11px] font-semibold text-stone-500">바로 이동:</span>
              {filtered.map((c) => (
                <a
                  key={c.id}
                  href={`#country-${c.id}`}
                  className="rounded-full bg-[#f7f2e9] px-2.5 py-0.5 text-[11px] font-medium text-stone-700 ring-1 ring-stone-300/70 transition hover:bg-[#1b4965] hover:text-white"
                >
                  {c.nameKo}
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Country Cultural Cards */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white/80 p-12 text-center shadow-sm ring-1 ring-stone-200">
            <p className="font-display text-xl text-stone-800">조건에 맞는 나라가 없어요</p>
            <p className="mt-2 text-sm text-stone-500">다른 대륙 필터를 선택하거나 검색어를 지워 보세요.</p>
            <button
              type="button"
              onClick={() => {
                setRegion("전체");
                setQuery("");
              }}
              className="mt-4 rounded-full bg-[#1b4965] px-4 py-2 text-xs font-semibold text-white"
            >
              전체 12개국 보기
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {filtered.map((country, idx) => (
              <article
                key={country.id}
                id={`country-${country.id}`}
                className="scroll-mt-6 overflow-hidden rounded-3xl bg-white/90 shadow-md ring-1 ring-stone-200/90"
              >
                <div className="grid lg:grid-cols-12">
                  {/* Illustration Panel */}
                  <div className="flex flex-col gap-4 bg-[#f1eadc]/65 p-4 sm:p-5 lg:col-span-5">
                    <div>
                      <button
                        type="button"
                        onClick={() => setLightboxId(country.id)}
                        className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-stone-200 shadow-sm ring-1 ring-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b4965]"
                        aria-label={`${country.nameKo} 일러스트 크게 보기`}
                      >
                        <Image
                          src={country.image}
                          alt={country.imageAlt}
                          fill
                          sizes="(max-width: 1024px) 100vw, 40vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition group-hover:bg-black/80">
                          그림 크게 보기
                        </span>
                      </button>
                      <p className="mt-2.5 px-1 text-xs leading-relaxed text-stone-600">{country.imageCaption}</p>
                    </div>

                    <div className="mt-4 rounded-2xl bg-[#8b2635]/[0.06] p-3.5 ring-1 ring-[#8b2635]/15">
                      <p className="text-[11px] font-bold tracking-wide text-[#8b2635]">알고 보면 더 재밌는 포인트</p>
                      <p className="mt-1 text-xs leading-relaxed text-stone-700">{country.funFact}</p>
                    </div>
                  </div>

                  {/* Narrative, Foods & Events */}
                  <div className="p-5 sm:p-7 lg:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold tabular-nums text-stone-400">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${REGION_BADGE_STYLE[country.region]}`}
                        >
                          {country.region}
                        </span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                          {country.seasonLabel}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200/80">
                          {country.celebrationWindow}
                        </span>
                      </div>
                      <span className="font-display text-sm text-[#8b2635]">{country.greeting}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
                      <h2 className="font-display text-2xl text-stone-900 sm:text-3xl">{country.nameKo}</h2>
                      <span className="text-sm font-medium text-stone-400">{country.nameEn}</span>
                    </div>
                    <p className="mt-1 text-base font-semibold text-[#1b4965]">{country.headline}</p>
                    <p className="mt-2.5 text-sm leading-relaxed text-stone-700">{country.summary}</p>

                    {/* Foods & Events Sections */}
                    <div className="mt-6 space-y-5">
                      {focus !== "event" && (
                        <section aria-label={`${country.nameKo}의 대표 음식`}>
                          <div className="flex items-center gap-2">
                            <span className="inline-block size-2 rounded-full bg-[#8b2635]" aria-hidden />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b2635]">
                              크리스마스 식탁 · 대표 음식 &amp; 음료
                            </h3>
                          </div>
                          <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                            {country.foods.map((food) => (
                              <li
                                key={food.name}
                                className="rounded-2xl bg-[#fbf8f3] p-3.5 ring-1 ring-stone-200/80"
                              >
                                <p className="text-sm font-bold text-stone-900">{food.name}</p>
                                {food.localName && (
                                  <p className="mt-0.5 text-[11px] font-medium text-stone-500">{food.localName}</p>
                                )}
                                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{food.description}</p>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {focus !== "food" && (
                        <section aria-label={`${country.nameKo}의 대표 이벤트와 풍습`}>
                          <div className="flex items-center gap-2">
                            <span className="inline-block size-2 rounded-full bg-[#1b4965]" aria-hidden />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b4965]">
                              축제와 풍습 · 대표 이벤트
                            </h3>
                          </div>
                          <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                            {country.events.map((ev) => (
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
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Global Calendar Timeline */}
        <section className="mt-14 rounded-3xl bg-[#13293d] p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-amber-200/80">GLOBAL CALENDAR</p>
              <h2 className="font-display mt-1 text-2xl text-[#fffaf2] sm:text-3xl">
                9월부터 1월 7일까지 이어지는 지구촌 크리스마스 달력
              </h2>
            </div>
            <p className="text-xs text-slate-300">나라마다 크리스마스의 절정은 12월 25일이 아닐 수도 있어요.</p>
          </div>

          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CHRISTMAS_TIMELINE.map((item) => (
              <li
                key={`${item.date}-${item.country}`}
                className="flex flex-col justify-between rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-amber-300/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
                      {item.date}
                    </span>
                    <span className="text-[11px] font-medium text-slate-300">{item.country}</span>
                  </div>
                  <h3 className="mt-2.5 text-sm font-bold text-white">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Illustration Lightbox Modal */}
      {lightboxCountry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${lightboxCountry.nameKo} 크리스마스 그림 자료`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxId(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-[#16222f] text-white shadow-2xl ring-1 ring-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full bg-black">
              <Image
                src={lightboxCountry.image}
                alt={lightboxCountry.imageAlt}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-200">
                  {lightboxCountry.nameKo} · {lightboxCountry.greeting}
                </p>
                <p className="mt-0.5 text-sm text-slate-200">{lightboxCountry.imageCaption}</p>
              </div>
              <div className="flex items-center gap-2">
                {filtered.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const prev = filtered[(lightboxIndex - 1 + filtered.length) % filtered.length];
                        if (prev) setLightboxId(prev.id);
                      }}
                      className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
                    >
                      ← 이전
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = filtered[(lightboxIndex + 1) % filtered.length];
                        if (next) setLightboxId(next.id);
                      }}
                      className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
                    >
                      다음 →
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxId(null)}
                  className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-900 hover:bg-stone-200"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
