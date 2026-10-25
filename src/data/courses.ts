import type { LayerSpec } from "@/lib/sound/engine";

export interface Stop {
  id: string;
  name: string;
  area: string;
  country: string;
  lat: number;
  lng: number;
  /** Initial view direction, compass degrees. */
  heading: number;
  description: string;
  tip?: string;
  searchQuery: string;
  palette: [string, string];
  soundscape: LayerSpec[];
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  country: string;
  cover: [string, string];
  stops: Stop[];
}

export const courses: Course[] = [
  {
    id: "gangneung-sea-and-forest",
    title: "강릉, 바다와 대숲 사이",
    subtitle: "커피거리에서 시작해 경포 바다, 오죽헌 대숲, 중앙시장까지",
    country: "KR",
    cover: ["#5fa8d3", "#1b4965"],
    stops: [
      {
        id: "anmok",
        name: "안목해변 커피거리",
        area: "강릉시 견소동",
        country: "KR",
        lat: 37.7726,
        lng: 128.9475,
        heading: 65,
        description:
          "바다를 마주한 카페들이 줄지어 선 거리. 등 뒤에는 커피 내리는 소리, 눈앞에는 동해 파도가 있어요.",
        tip: "바다 쪽을 바라보면 파도 소리가 정면에서, 뒤를 돌면 카페 소리가 가까워져요.",
        searchQuery: "강릉 안목해변 커피거리",
        palette: ["#9ccfe8", "#3d6f8e"],
        soundscape: [
          { kind: "waves", gain: 0.9, bearing: 65, label: "바다" },
          { kind: "gulls", gain: 0.4, bearing: 80 },
          { kind: "cafe", gain: 0.55, bearing: 245, label: "카페거리" },
          { kind: "wind", gain: 0.2 },
        ],
      },
      {
        id: "gyeongpo",
        name: "경포해변",
        area: "강릉시 안현동",
        country: "KR",
        lat: 37.8057,
        lng: 128.908,
        heading: 55,
        description: "길게 뻗은 백사장과 소나무 숲. 강릉 바다의 대표 풍경이에요.",
        tip: "뒤쪽 솔숲에서는 바람 소리와 새소리가 들려요.",
        searchQuery: "강릉 경포해변",
        palette: ["#b5dcef", "#c9b38a"],
        soundscape: [
          { kind: "waves", gain: 1, bearing: 55, label: "바다" },
          { kind: "gulls", gain: 0.3, bearing: 40 },
          { kind: "wind", gain: 0.35 },
          { kind: "birds", gain: 0.25, bearing: 235, label: "솔숲" },
        ],
      },
      {
        id: "ojukheon",
        name: "오죽헌",
        area: "강릉시 죽헌동",
        country: "KR",
        lat: 37.7794,
        lng: 128.8784,
        heading: 0,
        description: "율곡 이이가 태어난 집. 줄기가 까만 대나무, 오죽(烏竹)이 집을 둘러싸고 있어요.",
        tip: "대숲이 바람에 흔들리는 소리와 대나무끼리 부딪히는 소리에 집중해보세요.",
        searchQuery: "강릉 오죽헌",
        palette: ["#cfe3c4", "#4f6b3d"],
        soundscape: [
          { kind: "leaves", gain: 0.7, label: "대숲" },
          { kind: "birds", gain: 0.5 },
          { kind: "wind", gain: 0.25 },
        ],
      },
      {
        id: "jungang-market",
        name: "강릉중앙시장",
        area: "강릉시 성남동",
        country: "KR",
        lat: 37.7543,
        lng: 128.8989,
        heading: 90,
        description: "닭강정, 장칼국수, 수제 어묵. 강릉 먹거리가 모두 모인 전통시장이에요.",
        searchQuery: "강릉중앙시장 먹거리",
        palette: ["#f2d6a2", "#8a5a3b"],
        soundscape: [
          { kind: "market", gain: 0.8, label: "시장 골목" },
          { kind: "wind", gain: 0.1 },
        ],
      },
    ],
  },
  {
    id: "kyoto-bamboo",
    title: "교토, 아라시야마 대나무숲",
    subtitle: "해외 로드뷰 확인용 한 정거장 코스",
    country: "JP",
    cover: ["#a7c957", "#386641"],
    stops: [
      {
        id: "arashiyama",
        name: "아라시야마 치쿠린",
        area: "일본 교토부 교토시",
        country: "JP",
        lat: 35.017,
        lng: 135.6719,
        heading: 0,
        description: "하늘을 가릴 만큼 높이 자란 대나무 사이로 난 오솔길.",
        tip: "이른 아침에 가면 사람이 적어 대숲 소리를 온전히 들을 수 있어요.",
        searchQuery: "Arashiyama Bamboo Grove",
        palette: ["#d8e8c0", "#3e5c2c"],
        soundscape: [
          { kind: "leaves", gain: 0.8, label: "대숲" },
          { kind: "wind", gain: 0.35 },
          { kind: "birds", gain: 0.3 },
        ],
      },
    ],
  },
];

export const findCourse = (id: string) => courses.find((c) => c.id === id);
