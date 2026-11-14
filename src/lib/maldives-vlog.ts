export type VlogChapter = "인천" | "두바이" | "몰디브";

export type VlogScene = {
  id: string;
  chapter: VlogChapter;
  place: string;
  clock: string;
  image: string;
  alt: string;
  duration: number;
  cues: { at: number; line: string }[];
};

export const VLOG_SCENES: VlogScene[] = [
  {
    id: "incheon",
    chapter: "인천",
    place: "인천국제공항",
    clock: "05:12",
    image: "/vlog/vlog-01-incheon.jpg",
    alt: "새벽의 인천공항 출국장과 캐리어",
    duration: 10,
    cues: [
      { at: 0, line: "인천공항. 캐리어 하나만 끌고 나왔다." },
      { at: 5, line: "오늘은 두바이에서 하루. 내일은 몰디브." },
    ],
  },
  {
    id: "takeoff",
    chapter: "인천",
    place: "이륙",
    clock: "06:05",
    image: "/vlog/vlog-02-takeoff.jpg",
    alt: "비행기 창밖으로 보이는 새벽 바다",
    duration: 8,
    cues: [
      { at: 0, line: "창가 자리. 서해 위로 해가 올라온다." },
      { at: 4, line: "이제 기수를 두바이로 돌린다." },
    ],
  },
  {
    id: "dubai-road",
    chapter: "두바이",
    place: "두바이 시내",
    clock: "10:40",
    image: "/vlog/vlog-03-dubai-road.jpg",
    alt: "택시 안에서 바라본 두바이 스카이라인",
    duration: 9,
    cues: [
      { at: 0, line: "두바이. 공기가 뜨겁고 건조하다." },
      { at: 4.5, line: "택시 창밖으로 시내가 먼저 보인다." },
    ],
  },
  {
    id: "creek",
    chapter: "두바이",
    place: "두바이 크릭",
    clock: "15:10",
    image: "/vlog/vlog-04-creek.jpg",
    alt: "두바이 크릭의 다우와 옛 바람탑",
    duration: 10,
    cues: [
      { at: 0, line: "시내는 크릭에서 시작한다. 오래된 배와 바람탑." },
      { at: 5, line: "강 건너에는 이미 유리 빌딩이다." },
    ],
  },
  {
    id: "burj-day",
    chapter: "두바이",
    place: "부르즈 할리파",
    clock: "16:40",
    image: "/vlog/vlog-05-burj-day.jpg",
    alt: "낮의 부르즈 할리파",
    duration: 9,
    cues: [
      { at: 0, line: "부르즈 할리파. 아래에서 보면 끝이 없다." },
      { at: 4.5, line: "광장에 서서 한참을 올려다봤다." },
    ],
  },
  {
    id: "burj-night",
    chapter: "두바이",
    place: "분수와 야경",
    clock: "19:20",
    image: "/vlog/vlog-06-burj-night.jpg",
    alt: "밤에 켜진 부르즈 할리파와 분수",
    duration: 10,
    cues: [
      { at: 0, line: "해가 지면 분수가 올라온다." },
      { at: 5, line: "야경이 물에 길게 깔린다." },
    ],
  },
  {
    id: "dinner",
    chapter: "두바이",
    place: "디너 코스",
    clock: "20:05",
    image: "/vlog/vlog-07-dinner.jpg",
    alt: "부르즈 할리파가 창밖에 보이는 디너 코스",
    duration: 16,
    cues: [
      { at: 0, line: "창밖에 부르즈가 있는 레스토랑. 디너 코스." },
      { at: 5.5, line: "메인은 생선. 잔에 비친 불빛이 흔들린다." },
      { at: 11, line: "디저트까지 비우고, 야경을 한 번 더 보고 나왔다." },
    ],
  },
  {
    id: "seaplane",
    chapter: "몰디브",
    place: "말레 수상비행기",
    clock: "다음날 08:40",
    image: "/vlog/vlog-08-jetty.jpg",
    alt: "수상비행기 잔교를 걸어가는 여자",
    duration: 9,
    cues: [
      { at: 0, line: "다음날, 말레. 수상비행기 잔교." },
      { at: 4.5, line: "가방 하나 들고 걸어 들어간다." },
    ],
  },
  {
    id: "atolls",
    chapter: "몰디브",
    place: "환초 상공",
    clock: "09:10",
    image: "/vlog/vlog-09-atolls.jpg",
    alt: "수상비행기에서 내려다본 몰디브 환초",
    duration: 9,
    cues: [
      { at: 0, line: "이륙하니 환초가 점처럼 이어진다." },
      { at: 4.5, line: "에메랄드 위에 모래톱. 리조트는 저 끝이다." },
    ],
  },
  {
    id: "splashdown",
    chapter: "몰디브",
    place: "라군 착수",
    clock: "09:35",
    image: "/vlog/vlog-10-splashdown.jpg",
    alt: "리조트 라군에 내려앉는 수상비행기",
    duration: 8,
    cues: [
      { at: 0, line: "라군에 내려앉는다. 물이 유리 같다." },
      { at: 4, line: "섬에 워터빌라가 늘어서 있다." },
    ],
  },
  {
    id: "villa",
    chapter: "몰디브",
    place: "워터빌라",
    clock: "11:00",
    image: "/vlog/vlog-11-villa.jpg",
    alt: "라군이 바닥 유리 너머로 보이는 워터빌라",
    duration: 10,
    cues: [
      { at: 0, line: "워터빌라. 문을 열면 데크고, 바닥 밑은 라군." },
      { at: 5, line: "신발을 벗고 나무 바닥을 걸었다." },
    ],
  },
  {
    id: "reef",
    chapter: "몰디브",
    place: "하우스리프",
    clock: "14:10",
    image: "/vlog/vlog-13-reef.jpg",
    alt: "산호와 열대어가 있는 얕은 바다",
    duration: 10,
    cues: [
      { at: 0, line: "하우스리프에 들어갔다. 물이 따뜻하다." },
      { at: 5, line: "산호 사이로 노란 물고기 떼가 지나간다." },
    ],
  },
  {
    id: "turtle",
    chapter: "몰디브",
    place: "스노클링",
    clock: "14:20",
    image: "/vlog/vlog-14-turtle.jpg",
    alt: "산호초 위를 헤엄치는 바다거북",
    duration: 10,
    cues: [
      { at: 0, line: "고개를 드니 거북이가 바로 옆이다." },
      { at: 5, line: "산호 위를 천천히 헤엄쳐 간다." },
    ],
  },
  {
    id: "pool",
    chapter: "몰디브",
    place: "빌라 수영장",
    clock: "16:30",
    image: "/vlog/vlog-12-pool-w.jpg",
    alt: "빌라 수영장에 앉은 여자",
    duration: 10,
    cues: [
      { at: 0, line: "빌라 수영장. 물 끝이 바다랑 이어져 보인다." },
      { at: 5, line: "발을 담그고, 해가 기울 때까지 앉아 있었다." },
    ],
  },
  {
    id: "beach-dinner",
    chapter: "몰디브",
    place: "바닷가 디너",
    clock: "19:20",
    image: "/vlog/vlog-15-beach-dinner.jpg",
    alt: "노을이 보이는 바닷가 식탁의 남자와 여자",
    duration: 16,
    cues: [
      { at: 0, line: "해 질 녘, 바다가 식탁 끝이다." },
      { at: 5.5, line: "촛불 아래 둘만의 저녁. 잔이 조용히 부딪힌다." },
      { at: 11, line: "오늘은 여기까지. 리조트의 첫날." },
    ],
  },
];

export const VLOG_CHAPTERS: VlogChapter[] = ["인천", "두바이", "몰디브"];

export const VLOG_TOTAL = VLOG_SCENES.reduce((sum, scene) => sum + scene.duration, 0);

export function sceneStart(index: number) {
  let time = 0;
  for (let i = 0; i < index; i++) time += VLOG_SCENES[i]?.duration ?? 0;
  return time;
}

export function cueAt(scene: VlogScene, elapsed: number) {
  let current = scene.cues[0];
  for (const cue of scene.cues) {
    if (cue.at <= elapsed + 0.08) current = cue;
  }
  return current ?? { at: 0, line: "" };
}

export function formatClock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}
