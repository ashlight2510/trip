"use client";

import { useEffect, useState } from "react";
import type { PlaceMedia } from "@/db/schema";
import { attributionText, youtubeEmbedSrc } from "@/lib/media";

export function PlacePhotoStage({ images }: { images: PlaceMedia[] }) {
  const [i, setI] = useState(0);
  const current = images[i];

  useEffect(() => {
    if (images.length < 2) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % images.length), 7000);
    return () => clearInterval(id);
  }, [images]);

  if (!current) {
    return <div className="absolute inset-0 bg-stone-900" />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {images.map((img, idx) => (
        <div
          key={img.id}
          className={`absolute inset-0 transition-opacity duration-[1800ms] ease-out ${idx === i ? "opacity-100" : "opacity-0"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote commons URLs; avoid Next image optimizer quota during prototype */}
          <img
            src={img.url}
            alt={img.title ?? ""}
            className={`h-full w-full object-cover ${idx === i ? "animate-kenburns" : ""}`}
            draggable={false}
          />
        </div>
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />
      <p className="pointer-events-auto absolute bottom-28 left-5 right-5 text-[11px] text-white/70 md:bottom-8 md:right-auto md:max-w-md">
        {current.credit_url ? (
          <a href={current.credit_url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            {attributionText(current)}
          </a>
        ) : (
          attributionText(current)
        )}
      </p>
      {images.length > 1 && (
        <div className="pointer-events-auto absolute bottom-28 right-5 flex gap-1.5 md:bottom-8">
          {images.map((img, idx) => (
            <button
              key={img.id}
              aria-label={`${idx + 1}번째 사진`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PlaceVideoStage({ video }: { video: PlaceMedia }) {
  const src = youtubeEmbedSrc(video);
  if (!src) {
    return <div className="absolute inset-0 grid place-items-center bg-black text-sm text-white/70">영상을 불러올 수 없어요</div>;
  }

  return (
    <div className="absolute inset-0 bg-black">
      <iframe
        key={`${video.id}-${video.start_sec ?? 0}`}
        src={`${src}&autoplay=1`}
        title={video.title ?? "관광 홍보 영상"}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <p className="pointer-events-auto absolute bottom-28 left-5 right-5 z-10 rounded-lg bg-black/50 px-3 py-2 text-[11px] text-white/80 backdrop-blur md:bottom-8 md:right-auto md:max-w-lg">
        {video.credit_url ? (
          <a href={video.credit_url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            {attributionText(video)}
          </a>
        ) : (
          attributionText(video)
        )}
        <span className="block text-white/55">공식 플레이어로만 재생 · 영상은 다운로드하지 않습니다</span>
      </p>
    </div>
  );
}
