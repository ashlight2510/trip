/**
 * Curated Guam traveler spots — descriptions, regions, and 풍경너머 픽.
 *
 *   yarn seed:guam
 */
import type { Place, PlacePick, Region } from "../src/db/schema";
import { now, read, write } from "./lib/store";

type SeedPlace = {
  id: string;
  name: string;
  name_en: string;
  category: Place["category"];
  region_id: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  tags: string[];
  palette: [string, string];
  pickNote: string;
  pickRank: number;
};

const NEW_REGIONS: Region[] = [
  {
    id: "gu-yigo",
    parent_id: "gu-main",
    level: "city",
    name: "이고",
    name_en: "Yigo",
    country_code: "GU",
    lat: 13.534,
    lng: 144.886,
  },
  {
    id: "gu-yigo-d",
    parent_id: "gu-yigo",
    level: "district",
    name: "이고 일대",
    name_en: "Yigo area",
    country_code: "GU",
    lat: 13.65,
    lng: 144.86,
  },
  {
    id: "gu-talofofo",
    parent_id: "gu-main",
    level: "city",
    name: "탈로포포",
    name_en: "Talofofo",
    country_code: "GU",
    lat: 13.355,
    lng: 144.758,
  },
  {
    id: "gu-talofofo-d",
    parent_id: "gu-talofofo",
    level: "district",
    name: "탈로포포 일대",
    name_en: "Talofofo area",
    country_code: "GU",
    lat: 13.34,
    lng: 144.75,
  },
  {
    id: "gu-umatac",
    parent_id: "gu-main",
    level: "city",
    name: "우마탁",
    name_en: "Umatac",
    country_code: "GU",
    lat: 13.298,
    lng: 144.66,
  },
  {
    id: "gu-umatac-d",
    parent_id: "gu-umatac",
    level: "district",
    name: "우마탁 일대",
    name_en: "Umatac area",
    country_code: "GU",
    lat: 13.298,
    lng: 144.66,
  },
  {
    id: "gu-merizo",
    parent_id: "gu-main",
    level: "city",
    name: "메리조",
    name_en: "Merizo",
    country_code: "GU",
    lat: 13.266,
    lng: 144.67,
  },
  {
    id: "gu-merizo-d",
    parent_id: "gu-merizo",
    level: "district",
    name: "메리조 일대",
    name_en: "Merizo area",
    country_code: "GU",
    lat: 13.266,
    lng: 144.67,
  },
  {
    id: "gu-piti",
    parent_id: "gu-main",
    level: "city",
    name: "피티",
    name_en: "Piti",
    country_code: "GU",
    lat: 13.462,
    lng: 144.693,
  },
  {
    id: "gu-piti-d",
    parent_id: "gu-piti",
    level: "district",
    name: "피티 일대",
    name_en: "Piti area",
    country_code: "GU",
    lat: 13.462,
    lng: 144.693,
  },
  {
    id: "gu-asan",
    parent_id: "gu-main",
    level: "city",
    name: "아산",
    name_en: "Asan",
    country_code: "GU",
    lat: 13.472,
    lng: 144.71,
  },
  {
    id: "gu-asan-d",
    parent_id: "gu-asan",
    level: "district",
    name: "아산 일대",
    name_en: "Asan area",
    country_code: "GU",
    lat: 13.472,
    lng: 144.71,
  },
  {
    id: "gu-agat",
    parent_id: "gu-main",
    level: "city",
    name: "아갓",
    name_en: "Agat",
    country_code: "GU",
    lat: 13.383,
    lng: 144.655,
  },
  {
    id: "gu-agat-d",
    parent_id: "gu-agat",
    level: "district",
    name: "아갓 일대",
    name_en: "Agat area",
    country_code: "GU",
    lat: 13.383,
    lng: 144.655,
  },
];

const SEEDS: SeedPlace[] = [
  // —— Tumon / Tamuning (walk + short drive) ——
  {
    id: "gu-curated-ypao-beach",
    name: "이파오 비치 파크",
    name_en: "Ypao Beach Park",
    category: "beach",
    region_id: "gu-tumon-d-4d349479",
    address: "Ypao Rd, Tumon, Guam",
    lat: 13.5042,
    lng: 144.7893,
    description:
      "투몬베이의 대표 가족 해변. 수영·선셋·산책이 한곳에 모이고, 호텔가에서 걸어서도 닿아요.",
    tags: ["해변", "가족여행", "선셋", "산책", "투몬", "수영"],
    palette: ["#7ec8e3", "#1b6b8a"],
    pickNote: "투몬 숙소라면 산책권 — 수영·선셋 기본 코스",
    pickRank: 1,
  },
  {
    id: "gu-curated-tumon-beach",
    name: "투몬 비치",
    name_en: "Tumon Beach",
    category: "beach",
    region_id: "gu-tumon-d-4d349479",
    address: "Pale San Vitores Rd, Tumon, Guam",
    lat: 13.5149,
    lng: 144.8044,
    description:
      "호텔·리조트가 늘어선 투몬의 메인 해변 스트립. 낮엔 바다, 밤엔 산책·쇼핑 동선이 자연스러워요.",
    tags: ["해변", "호텔가", "산책", "야경", "투몬"],
    palette: ["#8fd3e8", "#2a7f9e"],
    pickNote: "호텔가 해변 산책 — 투몬의 기본 풍경",
    pickRank: 2,
  },
  {
    id: "gu-curated-gun-beach",
    name: "건 비치",
    name_en: "Gun Beach",
    category: "beach",
    region_id: "gu-tumon-d-4d349479",
    address: "Gun Beach Rd, Tumon, Guam",
    lat: 13.5255,
    lng: 144.8055,
    description:
      "투몬 북쪽의 조금 더 한적한 해변. 스노클·일출 사진 찍기 좋고, 메인스트립보다 여유로워요.",
    tags: ["해변", "스노클", "일출", "한적", "투몬"],
    palette: ["#6bb8d6", "#245f78"],
    pickNote: "투몬에서 한 템포 쉬고 싶을 때",
    pickRank: 8,
  },
  {
    id: "gu-curated-pikas-cafe",
    name: "피카스 카페",
    name_en: "Pika's Cafe",
    category: "cafe",
    region_id: "gu-tamuning-d-96129e19",
    address: "Tamuning, Guam",
    lat: 13.5076,
    lng: 144.8102,
    description:
      "로컬이 자주 찾는 브런치·커피 스팟. 투몬 호텔가에서 차로 가깝고, 괌 일상 맛에 가깝습니다.",
    tags: ["카페", "브런치", "로컬", "아침", "타무닝"],
    palette: ["#d4a574", "#6b4423"],
    pickNote: "로컬 브런치 — 호텔 조식 대신",
    pickRank: 10,
  },
  {
    id: "gu-curated-shirleys-cafe",
    name: "셜리스 카페",
    name_en: "Shirley's Coffee Shop",
    category: "cafe",
    region_id: "gu-tamuning-d-96129e19",
    address: "Tamuning, Guam",
    lat: 13.4921,
    lng: 144.7761,
    description:
      "괌에서 오래 사랑받은 커피숍. 간단한 아침·아메리칸 브렉퍼스트 감성으로 여행 첫날을 열기 좋아요.",
    tags: ["카페", "아침", "로컬", "클래식", "타무닝"],
    palette: ["#c4a882", "#5c4030"],
    pickNote: "올드스쿨 괌 아침 커피",
    pickRank: 14,
  },
  {
    id: "gu-curated-proa",
    name: "프로아 레스토랑",
    name_en: "Proa Restaurant",
    category: "restaurant",
    region_id: "gu-tumon-d-4d349479",
    address: "Tumon, Guam",
    lat: 13.4988,
    lng: 144.7825,
    description:
      "차모로 로컬 요리를 제대로 맛볼 수 있는 대표 레스토랑. 켈라구엔·바비큐 플레이트로 괌을 한입 요약해요.",
    tags: ["맛집", "차모로", "로컬푸드", "저녁", "투몬"],
    palette: ["#c47a5a", "#5a2e1f"],
    pickNote: "차모로 요리 입문 — 괌 맛집 1순위",
    pickRank: 3,
  },
  {
    id: "gu-curated-meskla",
    name: "메스클라 로컬 키친",
    name_en: "Meskla Local Kitchen",
    category: "restaurant",
    region_id: "gu-hagatna-d-89420875",
    address: "Hagåtña, Guam",
    lat: 13.4755,
    lng: 144.7485,
    description:
      "하갓냐 쪽 로컬 키친. 차모로·필리핀 퓨전이 섞인 메뉴로, 관광지 맛집과 결이 달라요.",
    tags: ["맛집", "로컬", "차모로", "하갓냐", "점심"],
    palette: ["#b86b4a", "#4a2a1c"],
    pickNote: "하갓냐 투어 동선에 끼우기 좋은 점심",
    pickRank: 12,
  },
  {
    id: "gu-curated-chamorro-village",
    name: "차모로 빌리지",
    name_en: "Chamorro Village (Paseo)",
    category: "market",
    region_id: "gu-hagatna-d-89420875",
    address: "Paseo de Susana, Hagåtña, Guam",
    lat: 13.4768,
    lng: 144.7522,
    description:
      "수요일 밤 야시장이 유명한 로컬 마켓. 길거리 음식·수공예·공연으로 괌의 생활감을 느껴보세요.",
    tags: ["시장", "야시장", "로컬", "수요일", "먹거리"],
    palette: ["#e0a35a", "#7a4a1e"],
    pickNote: "수요일 밤이면 필수 — 야시장 분위기",
    pickRank: 4,
  },
  {
    id: "gu-curated-dfs-galleria",
    name: "DFS 갤러리아 거리",
    name_en: "DFS Galleria Tumon",
    category: "street",
    region_id: "gu-tumon-d-4d349479",
    address: "Pale San Vitores Rd, Tumon, Guam",
    lat: 13.5005,
    lng: 144.796,
    description:
      "투몬 중심의 쇼핑·산책 거리. 면세·브랜드·야경 포토스팟이 모여 저녁 동선으로 편해요.",
    tags: ["쇼핑", "야경", "산책", "면세", "투몬"],
    palette: ["#9aa7b5", "#3d4a58"],
    pickNote: "저녁 투몬 산책·쇼핑 허브",
    pickRank: 15,
  },
  {
    id: "gu-curated-sandcastle",
    name: "샌드캐슬 시어터",
    name_en: "SandCastle Dinner Theater",
    category: "landmark",
    region_id: "gu-tumon-d-4d349479",
    address: "Tumon, Guam",
    lat: 13.5128,
    lng: 144.8056,
    description:
      "괌의 대표 디너쇼 극장. 가족·커플 저녁 코스로 많이 찾고, 투몬에서 차로 바로 닿아요.",
    tags: ["쇼", "저녁", "가족", "관광", "투몬"],
    palette: ["#d4b896", "#5a4634"],
    pickNote: "비 오는 저녁·가족 일정에 강한 쇼",
    pickRank: 16,
  },

  // —— Hagåtña heritage ——
  {
    id: "gu-curated-plaza-espana",
    name: "플라자 데 에스파냐",
    name_en: "Plaza de España",
    category: "heritage",
    region_id: "gu-hagatna-d-89420875",
    address: "Hagåtña, Guam",
    lat: 13.4748,
    lng: 144.752,
    description:
      "스페인 식민 시대 잔해가 남은 광장. 대성당·라떼스톤과 함께 하갓냐 역사 산책의 중심이에요.",
    tags: ["유적", "스페인", "역사", "하갓냐", "산책"],
    palette: ["#c4b59a", "#5c4e3a"],
    pickNote: "하갓냐 역사 코스 시작점",
    pickRank: 7,
  },
  {
    id: "gu-curated-cathedral",
    name: "둘체 놈브레 데 마리아 대성당",
    name_en: "Dulce Nombre de Maria Cathedral Basilica",
    category: "heritage",
    region_id: "gu-hagatna-d-89420875",
    address: "Hagåtña, Guam",
    lat: 13.4742,
    lng: 144.7528,
    description:
      "괌의 상징적 가톨릭 대성당. 플라자 옆이라 역사 투어에 자연스럽게 붙어요.",
    tags: ["성당", "역사", "하갓냐", "포토", "문화"],
    palette: ["#e8e0d4", "#6b5c4c"],
    pickNote: "하갓냐 스냅·역사 산책",
    pickRank: 13,
  },
  {
    id: "gu-curated-latte-stone-park",
    name: "라떼 스톤 파크",
    name_en: "Latte Stone Park",
    category: "heritage",
    region_id: "gu-hagatna-d-89420875",
    address: "Hagåtña, Guam",
    lat: 13.4756,
    lng: 144.75,
    description:
      "차모로 고대 기둥(라떼)이 늘어선 공원. 괌의 뿌리 문화를 가장 짧게 이해할 수 있는 장소예요.",
    tags: ["라떼스톤", "차모로", "역사", "공원", "하갓냐"],
    palette: ["#a89878", "#4a4030"],
    pickNote: "차모로 문화 한눈에 — 짧고 강함",
    pickRank: 9,
  },
  {
    id: "gu-curated-guam-museum",
    name: "괌 박물관",
    name_en: "Guam Museum",
    category: "landmark",
    region_id: "gu-hagatna-d-89420875",
    address: "Hagåtña, Guam",
    lat: 13.4806,
    lng: 144.7293,
    description:
      "괌의 역사·문화를 정리해 둔 박물관. 더운 한낮 실내 일정으로 쓰기 좋아요.",
    tags: ["박물관", "역사", "실내", "하갓냐", "문화"],
    palette: ["#8a9aaa", "#334455"],
    pickNote: "더운 날 실내 일정 · 역사 배경지식",
    pickRank: 17,
  },
  {
    id: "gu-curated-fort-santa-agueda",
    name: "산타 아구에다 요새",
    name_en: "Fort Santa Agueda",
    category: "viewpoint",
    region_id: "gu-hagatna-d-89420875",
    address: "Hagåtña, Guam",
    lat: 13.4735,
    lng: 144.7476,
    description:
      "하갓냐 시내와 항구가 내려다보이는 언덕 요새. 짧은 드라이브로 전망 포인트를 챙길 수 있어요.",
    tags: ["전망", "요새", "하갓냐", "포토", "드라이브"],
    palette: ["#7a8f6a", "#3a4a32"],
    pickNote: "하갓냐 전망 — 짧은 차로 이동",
    pickRank: 18,
  },

  // —— Mid / north drives ——
  {
    id: "gu-curated-two-lovers-point",
    name: "투 러버스 포인트",
    name_en: "Two Lovers Point",
    category: "viewpoint",
    region_id: "gu-tumon-d-4d349479",
    address: "Two Lovers Point, Guam",
    lat: 13.5353,
    lng: 144.8025,
    description:
      "절벽 위 전망대와 전설이 있는 괌 대표 포토스팟. 투몬에서 차로 가깝고, 선셋 때 특히 예뻐요.",
    tags: ["전망", "절벽", "선셋", "포토", "드라이브"],
    palette: ["#6a9bb8", "#2a4558"],
    pickNote: "괌 인증샷 — 투몬에서 차로 금방",
    pickRank: 5,
  },
  {
    id: "gu-curated-fish-eye",
    name: "피쉬아이 마린파크",
    name_en: "Fish Eye Marine Park",
    category: "landmark",
    region_id: "gu-piti-d",
    address: "Piti, Guam",
    lat: 13.4645,
    lng: 144.6905,
    description:
      "바다 속 전망대가 있는 마린파크. 스노클·수중 관찰을 편하게 하고 싶을 때 추천해요.",
    tags: ["마린파크", "스노클", "가족", "피티", "바다"],
    palette: ["#4aa3c4", "#1a4a5c"],
    pickNote: "가족·비오는 날에도 강한 수중 전망",
    pickRank: 6,
  },
  {
    id: "gu-curated-ritidian",
    name: "리티디안 포인트",
    name_en: "Ritidian Point (Guam NWR)",
    category: "beach",
    region_id: "gu-yigo-d",
    address: "Ritidian Point, Yigo, Guam",
    lat: 13.648,
    lng: 144.862,
    description:
      "섬 최북단의 원시 해변·야생보호구역. 고요한 바다와 절벽이 압도적이고, 렌트카 반나절 코스예요.",
    tags: ["해변", "야생", "북부", "드라이브", "한적"],
    palette: ["#5eb0c8", "#1e5a6a"],
    pickNote: "북부 드라이브 하이라이트 — 원시 해변",
    pickRank: 11,
  },
  {
    id: "gu-curated-tanguisson",
    name: "탕기손 비치",
    name_en: "Tanguisson Beach",
    category: "beach",
    region_id: "gu-tumon-d-4d349479",
    address: "Tanguisson, Guam",
    lat: 13.543,
    lng: 144.8084,
    description:
      "투몬 북쪽의 로컬 감성 해변. 사람이 덜하고 물색이 맑아, 짧은 드라이브로 ‘다른 괌’을 맛보기 좋아요.",
    tags: ["해변", "로컬", "한적", "스노클", "드라이브"],
    palette: ["#69b8d0", "#255868"],
    pickNote: "투몬에서 살짝 벗어난 맑은 해변",
    pickRank: 19,
  },

  // —— South island (needs car) ——
  {
    id: "gu-curated-talofofo-falls",
    name: "탈로포포 폭포",
    name_en: "Talofofo Falls",
    category: "forest",
    region_id: "gu-talofofo-d",
    address: "Talofofo, Guam",
    lat: 13.338,
    lng: 144.754,
    description:
      "정글 속 폭포와 케이블카·산책로. 남부 드라이브 코스의 시원한 휴식처예요.",
    tags: ["폭포", "정글", "가족", "남부", "드라이브"],
    palette: ["#5a8f5e", "#2a4a2e"],
    pickNote: "남부 정글·폭포 — 더위 식히는 코스",
    pickRank: 20,
  },
  {
    id: "gu-curated-inarajan-pools",
    name: "이나라한 내추럴 풀",
    name_en: "Inarajan Natural Pools",
    category: "beach",
    region_id: "gu-inalahan-d-61dbbc0c",
    address: "Inarajan, Guam",
    lat: 13.2735,
    lng: 144.7435,
    description:
      "용암 절벽 사이 천연 수영장. 파도가 거칠 수 있어 날·조수 확인이 필수, 그래도 남부 필수 풍경이에요.",
    tags: ["천연풀", "남부", "수영", "포토", "드라이브"],
    palette: ["#4a9ab0", "#1e4a58"],
    pickNote: "남부 시그니처 — 절벽 천연 수영장",
    pickRank: 21,
  },
  {
    id: "gu-curated-cetti-bay",
    name: "체티 베이 전망대",
    name_en: "Cetti Bay Overlook",
    category: "viewpoint",
    region_id: "gu-umatac-d",
    address: "Umatac, Guam",
    lat: 13.31,
    lng: 144.655,
    description:
      "남부 해안 도로의 대표 전망. 에메랄드 베이와 절벽이 한눈에 들어와 드라이브 중간 정차로 최고예요.",
    tags: ["전망", "남부", "드라이브", "포토", "해안도로"],
    palette: ["#5aa0b8", "#2a5060"],
    pickNote: "남부 해안도로 필수 정차",
    pickRank: 22,
  },
  {
    id: "gu-curated-fort-soledad",
    name: "솔레다드 요새",
    name_en: "Fort Soledad",
    category: "viewpoint",
    region_id: "gu-umatac-d",
    address: "Umatac, Guam",
    lat: 13.2965,
    lng: 144.6585,
    description:
      "우마탁 만을 내려다보는 스페인 요새 터. 마젤란 관련 역사와 남부 전망이 겹칩니다.",
    tags: ["요새", "전망", "역사", "우마탁", "남부"],
    palette: ["#9a8a6a", "#4a4030"],
    pickNote: "우마탁 만 전망 + 역사",
    pickRank: 23,
  },
  {
    id: "gu-curated-magellan",
    name: "마젤란 기념비",
    name_en: "Magellan Monument",
    category: "heritage",
    region_id: "gu-umatac-d",
    address: "Umatac, Guam",
    lat: 13.2978,
    lng: 144.6598,
    description:
      "마젤란 상륙과 연결된 기념비. 요새·만 전망과 묶어 남부 역사 스톱으로 짧게 들르면 좋아요.",
    tags: ["역사", "마젤란", "우마탁", "남부", "포토"],
    palette: ["#b0a080", "#524830"],
    pickNote: "남부 역사 스톱 — 짧게",
    pickRank: 24,
  },
  {
    id: "gu-curated-merizo-pier",
    name: "메리조 피어",
    name_en: "Merizo Pier",
    category: "landmark",
    region_id: "gu-merizo-d",
    address: "Merizo, Guam",
    lat: 13.2655,
    lng: 144.6695,
    description:
      "코코스섬 페리가 뜨는 남단 선착장. 잔잔한 라군 풍경과 남부 드라이브의 끝점 감성이 있어요.",
    tags: ["선착장", "코코스섬", "남부", "라군", "드라이브"],
    palette: ["#6ab0c4", "#2a5868"],
    pickNote: "남부 끝 · 코코스섬 출발점",
    pickRank: 25,
  },
  {
    id: "gu-curated-asan-war-park",
    name: "아산 전쟁기념공원",
    name_en: "War in the Pacific NHP — Asan",
    category: "heritage",
    region_id: "gu-asan-d",
    address: "Asan, Guam",
    lat: 13.4725,
    lng: 144.7085,
    description:
      "태평양전쟁 상륙 해안을 기리는 국립역사공원. 바다·유적·추모가 겹쳐, 의미 있는 드라이브 스톱이에요.",
    tags: ["전쟁사", "공원", "해변", "아산", "역사"],
    palette: ["#7a8a7a", "#3a4a3a"],
    pickNote: "역사·바다 동시에 — 서쪽 해안",
    pickRank: 26,
  },
  {
    id: "gu-curated-agat-beach",
    name: "아갓 비치",
    name_en: "Agat Beach",
    category: "beach",
    region_id: "gu-agat-d",
    address: "Agat, Guam",
    lat: 13.388,
    lng: 144.654,
    description:
      "서쪽 남부의 잔잔한 해변. 투몬과 분위기가 달라, 남부 드라이브 왕복길에 쉬어가기 좋아요.",
    tags: ["해변", "서부", "한적", "드라이브", "휴식"],
    palette: ["#6ab4c8", "#2a5a68"],
    pickNote: "남부 왕복길에 쉬는 서쪽 해변",
    pickRank: 27,
  },
];

/** Low-signal OSM leftovers — drop so curated pins stand out. */
const JUNK_NAME_RE =
  /Japanese gun|USA GUN CLUB|USO\b|ﾏｲｸﾛﾈｼｱ|General McArthur|John Paul II|Father Diego|Archbishop Felixberto|Freedom Latte|N C S Beach/i;

const ts = now();

const regions = read("regions");
const regionIds = new Set(regions.map((r) => r.id));
let regionAdded = 0;
for (const r of NEW_REGIONS) {
  if (regionIds.has(r.id)) continue;
  regions.push(r);
  regionIds.add(r.id);
  regionAdded++;
}
write("regions", regions);

const places = read("places");
const byId = new Map(places.map((p) => [p.id, p]));
let placeUpserted = 0;
let placeRemoved = 0;

for (const seed of SEEDS) {
  if (!regionIds.has(seed.region_id)) {
    throw new Error(`missing region ${seed.region_id} for ${seed.id}`);
  }
  const row: Place = {
    id: seed.id,
    name: seed.name,
    name_en: seed.name_en,
    category: seed.category,
    region_id: seed.region_id,
    address: seed.address,
    lat: seed.lat,
    lng: seed.lng,
    description: seed.description,
    tags: seed.tags,
    view_heading: null,
    palette: seed.palette,
    created_at: byId.get(seed.id)?.created_at ?? ts,
    updated_at: ts,
  };
  byId.set(seed.id, row);
  placeUpserted++;
}

const nextPlaces: Place[] = [];
for (const p of byId.values()) {
  if (p.id.startsWith("gu-") && !p.id.startsWith("gu-curated-") && JUNK_NAME_RE.test(p.name)) {
    placeRemoved++;
    continue;
  }
  // Soft-upgrade a few known OSM twins with description if curated covers same spot
  nextPlaces.push(p);
}
write("places", nextPlaces);

const picks = read("place_picks").filter((p) => p.collection !== "pn-guam");
const featuredAt = ts;
const guamPicks: PlacePick[] = SEEDS.map((s) => ({
  place_id: s.id,
  collection: "pn-guam" as const,
  note: s.pickNote,
  rank: s.pickRank,
  featured_at: featuredAt,
}));
write("place_picks", [...picks, ...guamPicks]);

// Also lift top Guam spots into main editorial picks (append after existing ranks).
const mainPicks = read("place_picks");
const maxMain = Math.max(0, ...mainPicks.filter((p) => p.collection === "pn-picks").map((p) => p.rank));
const topForMain = SEEDS.filter((s) => s.pickRank <= 6);
let mainRank = maxMain;
const extraMain: PlacePick[] = [];
for (const s of topForMain) {
  if (mainPicks.some((p) => p.collection === "pn-picks" && p.place_id === s.id)) continue;
  mainRank += 1;
  extraMain.push({
    place_id: s.id,
    collection: "pn-picks",
    note: `괌 · ${s.pickNote}`,
    rank: mainRank,
    featured_at: featuredAt,
  });
}
if (extraMain.length) {
  write("place_picks", [...mainPicks, ...extraMain]);
}

console.log(
  JSON.stringify(
    {
      regionAdded,
      placeUpserted,
      placeRemoved,
      guamPicks: guamPicks.length,
      mainPicksAdded: extraMain.length,
      guPlaces: read("places").filter((p) => p.id.startsWith("gu-")).length,
    },
    null,
    2,
  ),
);
