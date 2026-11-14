/** Playable layout of Dhigali, Raa Atoll. Meters, x east, y south from the island center. */
export const DHIGALI = {
  name: "디갈리",
  nameEn: "Dhigali Maldives",
  atoll: "라 환초",
  lat: 5.4754261,
  lng: 72.9541767,
  /** Ellipse half-axes of the cay, meters. */
  rx: 230,
  ry: 88,
  rotDeg: 18,
};

export type DhigaliSpot = {
  id: string;
  name: string;
  x: number;
  y: number;
  blurb: string;
  event: string;
  /** Fill for the little building on the sand. */
  roof: string;
};

export const DHIGALI_PIERS: [{ x: number; y: number }, { x: number; y: number }][] = [
  [
    { x: 20, y: -68 },
    { x: 34, y: -158 },
  ],
  [
    { x: 96, y: -8 },
    { x: 198, y: 28 },
  ],
];

export const DHIGALI_ITINERARY: { id: string; label: string }[] = [
  { id: "lobby", label: "체크인" },
  { id: "jade", label: "조식" },
  { id: "jetty", label: "하우스리프" },
  { id: "spa", label: "스파" },
  { id: "haali", label: "선셋" },
  { id: "battuta", label: "디너" },
];

export const DHIGALI_SPOTS: DhigaliSpot[] = [
  { id: "arrival", name: "도착 파빌리온", x: -20, y: 150, roof: "#f4efe4", blurb: "수상비행기가 내리는 남쪽 끝.", event: "따뜻한 환영 음료를 받았다." },
  { id: "lobby", name: "리셉션", x: 10, y: 70, roof: "#f7f3ea", blurb: "체크인과 버기 정류장.", event: "빌라 키를 건네받았다." },
  { id: "jade", name: "제이드", x: -30, y: 20, roof: "#d7efe4", blurb: "하루 종일 여는 다이닝.", event: "조식 뷔페에 앉았다. 라군이 창밖이다." },
  { id: "capers", name: "케이퍼스", x: 40, y: 10, roof: "#f3e2c8", blurb: "메인 레스토랑.", event: "저녁 코스를 예약했다." },
  { id: "cafe", name: "카페", x: 70, y: -20, roof: "#f6d7b0", blurb: "오후 커피와 젤라또.", event: "아이스 라테를 들고 해변으로 나왔다." },
  { id: "haali", name: "할리 선셋 바", x: -150, y: -10, roof: "#f0c27a", blurb: "서쪽 해변, 해가 지는 쪽.", event: "선셋 돌핀 크루즈에 올랐다." },
  { id: "east", name: "이스트 바", x: 120, y: 40, roof: "#e7b8a0", blurb: "메인 바.", event: "라이브 음악이 시작됐다." },
  { id: "spa", name: "디갈리 스파", x: -90, y: -40, roof: "#cfe3d4", blurb: "정원 안 스파와 플런지 풀.", event: "야외 데이베드에서 마사지를 받았다." },
  { id: "dive", name: "다이브 센터", x: 20, y: -70, roof: "#d5e4ef", blurb: "북쪽 하우스리프.", event: "스노클 장비를 빌렸다." },
  { id: "jetty", name: "다이브 제트", x: 30, y: -145, roof: "#efe6d2", blurb: "리프가 바로 앞인 북쪽 잔교.", event: "하우스리프에 들어갔다. 거북이 한 마리가 스쳐 갔다." },
  { id: "mosque", name: "모스크", x: -60, y: 40, roof: "#f7f7f2", blurb: "섬 안의 작은 모스크.", event: "조용히 신발을 벗고 지나갔다." },
  { id: "play", name: "플레이 키즈클럽", x: 90, y: 55, roof: "#f8d0cf", blurb: "아이들 클럽.", event: "아이들이 모래 놀이를 하고 있다." },
  { id: "splash", name: "스플래시", x: 155, y: -36, roof: "#b9dff0", blurb: "수상 스포츠.", event: "카약을 타고 라군을 한 바퀴 돌았다." },
  { id: "battuta", name: "바투타", x: -110, y: 50, roof: "#e8dcc8", blurb: "시그니처 레스토랑.", event: "발 담그는 디너가 시작됐다." },
  { id: "faru", name: "파루 그릴", x: 130, y: -62, roof: "#e6c2a0", blurb: "오버워터 쪽 그릴.", event: "그릴 디너를 주문했다." },
  { id: "villas", name: "워터 빌라", x: 188, y: 22, roof: "#f4efe6", blurb: "라군 위 빌라 데크.", event: "데크에 앉아 물을 내려다봤다." },
];

export type DhigaliNpc = {
  id: string;
  name: string;
  color: string;
  path: { x: number; y: number }[];
  speed: number;
  line: string;
};

export const DHIGALI_NPCS: DhigaliNpc[] = [
  { id: "staff", name: "리조트 스태프", color: "#1b4965", speed: 0.12, line: "버기는 리셉션 앞에 있어요. 모래가 뜨거우면 태워 드릴게요.", path: [{ x: 10, y: 70 }, { x: -20, y: 150 }, { x: 40, y: 10 }, { x: 10, y: 70 }] },
  { id: "couple", name: "신혼 커플", color: "#9a4e3a", speed: 0.07, line: "할리에서 해가 지면 돌핀이 잔교 밖으로 지나가요.", path: [{ x: -150, y: -10 }, { x: -90, y: -40 }, { x: 70, y: -20 }, { x: -150, y: -10 }] },
  { id: "snorkel", name: "스노클러", color: "#2a7f9e", speed: 0.09, line: "하우스리프는 북쪽 제트에서 바로 들어가요. 거북이가 자주 보여요.", path: [{ x: 20, y: -70 }, { x: 30, y: -145 }, { x: 20, y: -70 }] },
  { id: "kids", name: "아이와 부모", color: "#b06a3a", speed: 0.08, line: "키즈클럽에 맡기고 스파 가도 돼요.", path: [{ x: 90, y: 55 }, { x: 40, y: 10 }, { x: 150, y: -30 }, { x: 90, y: 55 }] },
  { id: "chef", name: "셰프", color: "#3f6b45", speed: 0.06, line: "바투타는 저녁에 열고, 제이드는 아침부터예요.", path: [{ x: -30, y: 20 }, { x: 40, y: 10 }, { x: -110, y: 50 }, { x: -30, y: 20 }] },
];

function onEllipse(x: number, y: number) {
  const rad = (-DHIGALI.rotDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const xr = x * c - y * s;
  const yr = x * s + y * c;
  return (xr / DHIGALI.rx) ** 2 + (yr / DHIGALI.ry) ** 2 <= 1;
}

function nearPier(x: number, y: number) {
  for (const [a, b] of DHIGALI_PIERS) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
    const d = Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
    if (d < 16) return true;
  }
  return false;
}

export function dhigaliInside(x: number, y: number) {
  return onEllipse(x, y) || nearPier(x, y);
}

export function nearestPerson(
  x: number,
  y: number,
  people: { x: number; y: number; npc: DhigaliNpc }[],
  reach = 26,
) {
  let best: DhigaliNpc | null = null;
  let bestD = reach;
  for (const person of people) {
    const d = Math.hypot(person.x - x, person.y - y);
    if (d < bestD) {
      best = person.npc;
      bestD = d;
    }
  }
  return best;
}

export function nearestSpot(x: number, y: number, reach = 28) {
  let best: DhigaliSpot | null = null;
  let bestD = reach;
  for (const spot of DHIGALI_SPOTS) {
    const d = Math.hypot(spot.x - x, spot.y - y);
    if (d < bestD) {
      best = spot;
      bestD = d;
    }
  }
  return best;
}
