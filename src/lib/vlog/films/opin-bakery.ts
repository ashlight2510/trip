import { shotsToScenes } from "../build-scene";
import type { PhotoVlogFilm } from "../types";

/** Quiet rainy weekend afternoon at Opin Bakery — template demo (stills + TTS). */
export const opinBakeryFilm: PhotoVlogFilm = {
  id: "opin-bakery",
  title: "오핀베이커리 · 비 오는 주말",
  eyebrow: "가상 브이로그",
  seriesLabel: "카페 힐링",
  blurb: "한적한 주말 오후.\n비 오는 날, 오핀베이커리에서 천천히.",
  endTitle: "마음이 조금 말랐다",
  endBlurb: "빗소리만 남기고, 카페 문을 나선다.",
  endPrimaryLabel: "다시 보기",
  homeLink: { href: "/vlog", label: "목록" },
  bgm: "calm",
  scenes: shotsToScenes([
    {
      id: "rain-street",
      chapter: "가는 길",
      place: "골목",
      clock: "토 14:10",
      image: "/vlog/opin-bakery/01-rain-street.jpg",
      alt: "비에 젖은 골목과 멀리 보이는 카페 불빛",
      lines: ["주말 오후. 하늘이 낮게 내려앉아 있다.", "발밑으로 빗물이 조용히 흐른다."],
    },
    {
      id: "entrance",
      chapter: "도착",
      place: "오핀베이커리",
      clock: "14:18",
      image: "/vlog/opin-bakery/02-entrance.jpg",
      alt: "비에 젖은 오핀베이커리 입구",
      lines: ["오핀베이커리. 창에 빗방울이 맺혀 있다.", "문을 밀면 따뜻한 공기가 먼저 나온다."],
    },
    {
      id: "bread",
      chapter: "안",
      place: "빵 진열",
      clock: "14:22",
      image: "/vlog/opin-bakery/03-bread.jpg",
      alt: "따뜻한 베이커리 진열장",
      lines: ["빵 냄새가 비를 밀어낸다.", "오늘은 하나만 고른다. 천천히."],
    },
    {
      id: "window",
      chapter: "자리",
      place: "창가",
      clock: "14:35",
      image: "/vlog/opin-bakery/04-window-seat.jpg",
      alt: "창가의 라떼와 페이스트리",
      lines: ["창가 자리. 빗줄기가 유리에 길게 내려온다.", "커피가 식을 때까지, 아무 말도 안 해도 된다."],
    },
    {
      id: "corner",
      chapter: "머물기",
      place: "구석 자리",
      clock: "15:20",
      image: "/vlog/opin-bakery/05-corner.jpg",
      alt: "책과 커피가 있는 조용한 카페 코너",
      lines: ["구석에 앉아 빗소리만 듣는다.", "한적한 오후. 이것만으로 충분하다."],
    },
  ]),
};
