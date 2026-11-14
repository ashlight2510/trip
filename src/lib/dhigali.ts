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
};

export const DHIGALI_SPOTS: DhigaliSpot[] = [
  { id: "arrival", name: "도착 파빌리온", x: -20, y: 150, blurb: "수상비행기가 내리는 남쪽 끝.", event: "따뜻한 환영 음료를 받았다." },
  { id: "lobby", name: "리셉션", x: 10, y: 70, blurb: "체크인과 버기 정류장.", event: "빌라 키를 건네받았다." },
  { id: "jade", name: "제이드", x: -30, y: 20, blurb: "하루 종일 여는 다이닝.", event: "조식 뷔페에 앉았다. 라군이 창밖이다." },
  { id: "capers", name: "케이퍼스", x: 40, y: 10, blurb: "메인 레스토랑.", event: "저녁 코스를 예약했다." },
  { id: "cafe", name: "카페", x: 70, y: -20, blurb: "오후 커피와 젤라또.", event: "아이스 라테를 들고 해변으로 나왔다." },
  { id: "haali", name: "할리 선셋 바", x: -150, y: -10, blurb: "서쪽 해변, 해가 지는 쪽.", event: "선셋 돌핀 크루즈에 올랐다." },
  { id: "east", name: "이스트 바", x: 120, y: 40, blurb: "메인 바.", event: "라이브 음악이 시작됐다." },
  { id: "spa", name: "디갈리 스파", x: -90, y: -40, blurb: "정원 안 스파와 플런지 풀.", event: "야외 데이베드에서 마사지를 받았다." },
  { id: "dive", name: "다이브 센터", x: 20, y: -70, blurb: "북쪽 하우스리프.", event: "스노클 장비를 빌렸다." },
  { id: "jetty", name: "다이브 제트", x: 30, y: -130, blurb: "리프가 바로 앞인 북쪽 잔교.", event: "하우스리프에 들어갔다. 거북이 한 마리가 스쳐 갔다." },
  { id: "mosque", name: "모스크", x: -60, y: 40, blurb: "섬 안의 작은 모스크.", event: "조용히 신발을 벗고 지나갔다." },
  { id: "play", name: "플레이 키즈클럽", x: 90, y: 55, blurb: "아이들 클럽.", event: "아이들이 모래 놀이를 하고 있다." },
  { id: "splash", name: "스플래시", x: 160, y: -30, blurb: "수상 스포츠.", event: "카약을 타고 라군을 한 바퀴 돌았다." },
  { id: "battuta", name: "바투타", x: -110, y: 50, blurb: "시그니처 레스토랑.", event: "발 담그는 디너가 시작됐다." },
  { id: "faru", name: "파루 그릴", x: 140, y: -70, blurb: "오버워터 빌라 쪽 그릴.", event: "그릴 디너를 주문했다." },
  { id: "villas", name: "워터 빌라", x: 180, y: 20, blurb: "라군 위 빌라 데크.", event: "데크에 앉아 물을 내려다봤다." },
];

export type DhigaliNpc = {
  id: string;
  name: string;
  color: string;
  path: { x: number; y: number }[];
  speed: number;
};

export const DHIGALI_NPCS: DhigaliNpc[] = [
  { id: "staff", name: "리조트 스태프", color: "#1b4965", speed: 0.12, path: [{ x: 10, y: 70 }, { x: -20, y: 150 }, { x: 40, y: 10 }, { x: 10, y: 70 }] },
  { id: "couple", name: "신혼 커플", color: "#9a4e3a", speed: 0.07, path: [{ x: -150, y: -10 }, { x: -90, y: -40 }, { x: 70, y: -20 }, { x: -150, y: -10 }] },
  { id: "snorkel", name: "스노클러", color: "#2a7f9e", speed: 0.09, path: [{ x: 20, y: -70 }, { x: 30, y: -130 }, { x: 20, y: -70 }] },
  { id: "kids", name: "아이와 부모", color: "#b06a3a", speed: 0.08, path: [{ x: 90, y: 55 }, { x: 40, y: 10 }, { x: 160, y: -30 }, { x: 90, y: 55 }] },
  { id: "chef", name: "셰프", color: "#3f6b45", speed: 0.06, path: [{ x: -30, y: 20 }, { x: 40, y: 10 }, { x: -110, y: 50 }, { x: -30, y: 20 }] },
];

export function dhigaliInside(x: number, y: number) {
  const rad = (-DHIGALI.rotDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const xr = x * c - y * s;
  const yr = x * s + y * c;
  return (xr / DHIGALI.rx) ** 2 + (yr / DHIGALI.ry) ** 2 <= 1;
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
