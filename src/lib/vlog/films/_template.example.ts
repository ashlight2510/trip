import { shotsToScenes } from "../build-scene";
import type { PhotoVlogFilm } from "../types";

/**
 * Copy this file → `films/your-trip.ts`, put images in `public/vlog/your-trip/`,
 * then mount: `<PhotoVlogPlayer film={yourTripFilm} />`.
 *
 * No AI video tokens per view — stills + browser TTS only.
 * Optional later: bake B-roll MP4s once with GenerateVideo and swap `image` → `video`.
 */
export const templateExampleFilm: PhotoVlogFilm = {
  id: "template-example",
  title: "사진 + 스크립트 템플릿",
  eyebrow: "가상 브이로그",
  blurb: "shots에 이미지 경로와 대사만 넣으면 타이밍·재생은 플레이어가 맡는다.",
  endTitle: "끝",
  endBlurb: "다음 여행지를 이 형식으로 추가하면 된다.",
  scenes: shotsToScenes([
    {
      id: "arrive",
      chapter: "도착",
      place: "공항",
      clock: "09:00",
      image: "/vlog/vlog-01-incheon.jpg",
      alt: "예시 도착 장면",
      lines: ["공항에 내렸다.", "오늘은 이 도시만 천천히 본다."],
    },
    {
      id: "walk",
      chapter: "시내",
      place: "골목",
      clock: "14:00",
      image: "/vlog/vlog-04-creek.jpg",
      lines: ["골목 끝에서 바람 냄새가 난다."],
    },
  ]),
};
