/**
 * Generate unique travel-poster SVG illustrations for each world landmark.
 * AI jpgs in public/landmarks/lm-NNN.jpg override these when present.
 *
 *   yarn tsx scripts/generate-landmark-illustrations.mts
 */
import fs from "node:fs";
import path from "node:path";
import { WORLD_LANDMARKS_200 } from "../src/lib/world-landmarks-200";

type Scene =
  | "neon_city"
  | "park"
  | "waterfall"
  | "theme_park"
  | "museum"
  | "tower"
  | "palace"
  | "ruins"
  | "cathedral"
  | "mosque"
  | "pyramid"
  | "wall"
  | "temple_asia"
  | "torii"
  | "mountain"
  | "beach"
  | "canyon"
  | "desert"
  | "glacier"
  | "safari"
  | "harbor"
  | "market"
  | "plaza"
  | "island"
  | "generic";

const PALETTES: Record<string, [string, string, string, string]> = {
  slate: ["#0f2740", "#1b4965", "#7aa2b8", "#e8f1f6"],
  amber: ["#3d1f0a", "#8a4b16", "#e0a35a", "#fff0d6"],
  sky: ["#0a2a44", "#1a6fa8", "#7ec8e8", "#e6f6ff"],
  orange: ["#3a1608", "#b04a1c", "#e9a66a", "#ffe8d2"],
  teal: ["#0a3333", "#1b7a6e", "#7dcdc0", "#e5faf6"],
  rose: ["#3a1018", "#a83b4a", "#e8a0a8", "#ffe8ec"],
  stone: ["#2a2622", "#6b6560", "#b8b0a6", "#f3efe8"],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function sceneOf(name: string): Scene {
  if (/타임스스퀘어|도톤보리|시부야|라스베이거스|명동/.test(name)) return "neon_city";
  if (/센트럴파크|스탠리파크|밀레니엄|하이라인|이화원|케이켄호프/.test(name)) return "park";
  if (/폭포|나이아가라|이과수|빅토리아|플리트비체/.test(name)) return "waterfall";
  if (/디즈니|유니버설/.test(name)) return "theme_park";
  if (/박물관|미술관|메트로폴리탄|스미소니언|에르미타주|프라도|오르세|반고흐/.test(name))
    return "museum";
  if (/에펠|스카이트리|CN타워|부르즈|타워브리지|런던아이|남산|타이베이 101|엠파이어|원월드|스페이스니들/.test(name))
    return "tower";
  if (/궁전|자금성|베르사유|버킹엄|쇤브룬|왕궁|시티팰리스|호수궁전|알함브라|노이슈반슈타인|프라하성|오사카성|경복|창덕/.test(name))
    return "palace";
  if (/콜로세움|폼페이|포로|아크로폴리스|에페소스|병마용|치첸|테오티우아칸|티칼|나스카|시길리야/.test(name))
    return "ruins";
  if (/성당|두오모|사그라다|노트르담|밀라노 대성당|쾰른|판테온|성 베드로|몽생미셸/.test(name))
    return "cathedral";
  if (/모스크|메카|메디나|블루모스크|아야소피아|그랜드모스크|황금사원|슈웨다곤/.test(name)) return "mosque";
  if (/피라미드|기자|아부심벨/.test(name)) return "pyramid";
  if (/만리장성|성벽|두브로브니크/.test(name)) return "wall";
  if (/후시미|토리이|이나리/.test(name)) return "torii";
  if (/앙코르|금각|센소지|기요미즈|불국|보로부두르|프람바난|왓|사원|신전|도다이지|이쓰쿠시마|랄리벨라|바간/.test(name))
    return "temple_asia";
  if (/후지|마터호른|킬리만자로|한라|설악|융프라우|돌로미티|토레스|테이블마운틴|울루루|알프스|로키|안나푸르나|에베레스트|린자니|키나발루/.test(name))
    return "mountain";
  if (/해변|비치|와이키키|본다이|코파카바나|푸켓|보라카이|산토리니|카프리|이비사|괌|몰디브|보라보라|칸쿤|툴룸|미케/.test(name))
    return "beach";
  if (/캐년|그랜드캐년|앤텔로프|자이언|브라이스|아치스|콜카/.test(name)) return "canyon";
  if (/사막|사하라|와디럼|아타카마|고비|나미브|우유니/.test(name)) return "desert";
  if (/빙하|글래시어|조쿨|페리토모레노|피요르드|밀포드/.test(name)) return "glacier";
  if (/세렝게티|마사이|크루거|응고롱고로|오카방고|야라|판타나우|갈라파고스/.test(name)) return "safari";
  if (/오페라하우스|하버|와이탄|마리나베이|머라이언|센토사|할롱|피피|코모도|라자암파트/.test(name))
    return "harbor";
  if (/바자르|시장|짜뚜짝|그랜드바자르|몰\b|두바이몰/.test(name)) return "market";
  if (/광장|그랑플라스|마리엔|산마르코|천안문|의회의사당|브란덴부르크/.test(name)) return "plaza";
  if (/섬|제주|미야지마|이스터|피지|팔라완|발리|오키나와/.test(name)) return "island";
  return "generic";
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function drawScene(scene: Scene, seed: number, c0: string, c1: string, c2: string, c3: string): string {
  const j = (n: number) => ((seed >> n) & 15) / 15;
  const clouds = Array.from({ length: 4 }, (_, i) => {
    const x = 40 + ((seed + i * 97) % 820);
    const y = 40 + ((seed >> i) % 70);
    const r = 28 + (i % 3) * 12;
    return `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.45}" fill="${c3}" opacity="${0.12 + j(i) * 0.12}"/>`;
  }).join("");

  const ground = `<path d="M0 520 Q240 ${480 + j(2) * 40} 480 510 T960 530 L960 720 L0 720 Z" fill="${c1}" opacity="0.55"/>`;

  switch (scene) {
    case "neon_city":
      return `${clouds}
        <rect x="0" y="380" width="960" height="340" fill="#0a1020"/>
        ${[120, 220, 320, 420, 520, 620, 720, 800]
          .map((x, i) => {
            const h = 140 + ((seed + i * 37) % 180);
            return `<rect x="${x}" y="${520 - h}" width="${40 + (i % 3) * 18}" height="${h}" fill="${i % 2 ? c1 : "#152238"}" opacity="0.95"/>
            <rect x="${x + 6}" y="${528 - h}" width="10" height="10" fill="#f5c518" opacity="0.9"/>
            <rect x="${x + 22}" y="${548 - h}" width="10" height="10" fill="#ff5ac8" opacity="0.85"/>`;
          })
          .join("")}
        <rect x="60" y="560" width="840" height="18" fill="#2a3148"/>
        <circle cx="200" cy="600" r="16" fill="#f5c518"/><circle cx="240" cy="600" r="16" fill="#f5c518"/>`;
    case "park":
      return `${clouds}${ground}
        <ellipse cx="480" cy="560" rx="220" ry="50" fill="${c2}" opacity="0.35"/>
        <path d="M120 520 C180 420 220 420 260 520" fill="${c0}"/><path d="M300 530 C360 400 420 400 470 530" fill="${c1}"/>
        <path d="M520 525 C580 390 650 390 700 525" fill="${c0}"/><path d="M740 535 C800 430 860 430 900 535" fill="${c1}"/>
        <path d="M80 560 Q480 620 880 550" stroke="${c3}" stroke-width="10" fill="none" opacity="0.5"/>`;
    case "waterfall":
      return `${clouds}
        <path d="M0 200 L320 240 L400 720 L0 720 Z" fill="${c0}"/>
        <path d="M960 220 L640 250 L560 720 L960 720 Z" fill="${c1}"/>
        <path d="M360 240 L480 240 L500 720 L340 720 Z" fill="${c3}" opacity="0.85"/>
        <path d="M400 240 L460 240 L470 720 L390 720 Z" fill="#d9f2ff" opacity="0.55"/>
        <ellipse cx="430" cy="640" rx="120" ry="28" fill="${c3}" opacity="0.35"/>`;
    case "theme_park":
      return `${clouds}${ground}
        <path d="M480 180 L560 420 L400 420 Z" fill="${c3}"/><path d="M480 180 L540 400 L420 400 Z" fill="${c2}"/>
        <rect x="430" y="420" width="100" height="120" fill="${c1}"/>
        <circle cx="200" cy="480" r="70" fill="none" stroke="${c2}" stroke-width="10"/>
        <circle cx="760" cy="500" r="55" fill="none" stroke="${c3}" stroke-width="8"/>
        <path d="M150 560 Q480 480 810 560" stroke="${c2}" stroke-width="6" fill="none" opacity="0.7"/>`;
    case "museum":
      return `${clouds}${ground}
        <rect x="180" y="300" width="600" height="260" fill="${c3}" opacity="0.9"/>
        <rect x="200" y="320" width="560" height="200" fill="${c1}"/>
        ${[260, 340, 420, 500, 580, 660]
          .map((x) => `<rect x="${x}" y="340" width="36" height="160" fill="${c3}" opacity="0.85"/>`)
          .join("")}
        <polygon points="480,210 160,300 800,300" fill="${c2}"/>
        <rect x="300" y="520" width="360" height="24" fill="${c0}"/>`;
    case "tower":
      return `${clouds}${ground}
        <path d="M480 120 L520 520 L440 520 Z" fill="${c3}" opacity="0.95"/>
        <path d="M480 120 L505 500 L455 500 Z" fill="${c2}"/>
        <rect x="455" y="280" width="50" height="12" fill="${c1}"/>
        <rect x="445" y="360" width="70" height="12" fill="${c1}"/>
        <rect x="430" y="440" width="100" height="14" fill="${c1}"/>
        <circle cx="480" cy="150" r="10" fill="${c3}"/>`;
    case "palace":
      return `${clouds}${ground}
        <rect x="200" y="340" width="560" height="200" fill="${c2}"/>
        <rect x="240" y="280" width="100" height="80" fill="${c1}"/><rect x="430" y="250" width="100" height="110" fill="${c1}"/><rect x="620" y="280" width="100" height="80" fill="${c1}"/>
        <path d="M240 280 L290 220 L340 280 Z" fill="${c3}"/><path d="M430 250 L480 180 L530 250 Z" fill="${c3}"/><path d="M620 280 L670 220 L720 280 Z" fill="${c3}"/>
        ${[280, 360, 440, 520, 600, 680]
          .map((x) => `<rect x="${x}" y="380" width="28" height="70" fill="${c0}" opacity="0.35"/>`)
          .join("")}`;
    case "ruins":
      return `${clouds}${ground}
        <path d="M140 420 Q480 360 820 430 L800 560 L160 560 Z" fill="${c1}" opacity="0.5"/>
        ${[200, 300, 400, 500, 600, 700]
          .map((x, i) => {
            const h = 90 + ((seed + i) % 80);
            return `<rect x="${x}" y="${520 - h}" width="44" height="${h}" fill="${c2}" opacity="${0.7 + (i % 3) * 0.08}"/><rect x="${x + 8}" y="${528 - h}" width="28" height="34" fill="${c0}" opacity="0.35"/>`;
          })
          .join("")}`;
    case "cathedral":
      return `${clouds}${ground}
        <path d="M480 140 L560 320 L400 320 Z" fill="${c3}"/>
        <rect x="360" y="320" width="240" height="220" fill="${c2}"/>
        <rect x="300" y="380" width="70" height="160" fill="${c1}"/><rect x="590" y="380" width="70" height="160" fill="${c1}"/>
        <path d="M300 380 L335 300 L370 380 Z" fill="${c3}"/><path d="M590 380 L625 300 L660 380 Z" fill="${c3}"/>
        <rect x="455" y="420" width="50" height="120" fill="${c0}" opacity="0.45"/>
        <circle cx="480" cy="360" r="28" fill="${c3}" opacity="0.8"/>`;
    case "mosque":
      return `${clouds}${ground}
        <ellipse cx="480" cy="320" rx="160" ry="120" fill="${c3}"/>
        <rect x="300" y="320" width="360" height="200" fill="${c2}"/>
        <rect x="200" y="260" width="36" height="280" fill="${c1}"/><rect x="724" y="260" width="36" height="280" fill="${c1}"/>
        <circle cx="218" cy="250" r="18" fill="${c3}"/><circle cx="742" cy="250" r="18" fill="${c3}"/>
        <path d="M300 320 Q480 180 660 320" fill="${c3}"/>
        <rect x="450" y="400" width="60" height="120" fill="${c0}" opacity="0.35"/>`;
    case "pyramid":
      return `${clouds}
        <rect x="0" y="420" width="960" height="300" fill="${c2}" opacity="0.45"/>
        <path d="M180 560 L320 300 L460 560 Z" fill="${c1}"/><path d="M360 560 L520 220 L680 560 Z" fill="${c2}"/><path d="M560 560 L680 340 L800 560 Z" fill="${c1}"/>
        <ellipse cx="700" cy="500" rx="70" ry="36" fill="${c0}" opacity="0.35"/>
        <circle cx="780" cy="160" r="36" fill="${c3}" opacity="0.7"/>`;
    case "wall":
      return `${clouds}
        <path d="M0 420 C160 360 240 480 400 400 S680 300 960 360 L960 560 L0 560 Z" fill="${c1}"/>
        ${[80, 200, 340, 480, 620, 760, 880]
          .map((x, i) => `<rect x="${x}" y="${340 + (i % 3) * 20}" width="36" height="${70 + (i % 4) * 16}" fill="${c2}"/><rect x="${x + 6}" y="${348 + (i % 3) * 20}" width="24" height="16" fill="${c0}" opacity="0.35"/>`)
          .join("")}
        <path d="M0 560 L960 520 L960 720 L0 720 Z" fill="${c0}" opacity="0.55"/>`;
    case "torii":
      return `${clouds}${ground}
        ${[180, 280, 380, 480, 580, 680]
          .map((x, i) => {
            const s = 1 - i * 0.06;
            const y = 280 + i * 28;
            return `<g transform="translate(${x},${y}) scale(${s})">
              <rect x="-10" y="0" width="16" height="160" fill="#c62828"/>
              <rect x="54" y="0" width="16" height="160" fill="#c62828"/>
              <rect x="-28" y="-8" width="116" height="18" fill="#b71c1c"/>
              <rect x="-18" y="24" width="96" height="12" fill="#c62828"/>
            </g>`;
          })
          .join("")}`;
    case "temple_asia":
      return `${clouds}${ground}
        <rect x="360" y="360" width="240" height="160" fill="${c1}"/>
        <path d="M330 360 L480 250 L630 360 Z" fill="${c2}"/>
        <path d="M350 300 L480 210 L610 300 Z" fill="${c3}"/>
        <rect x="450" y="420" width="60" height="100" fill="${c0}" opacity="0.4"/>
        <rect x="200" y="480" width="120" height="60" fill="${c2}" opacity="0.7"/>
        <rect x="640" y="470" width="120" height="70" fill="${c2}" opacity="0.7"/>`;
    case "mountain":
      return `${clouds}
        <path d="M0 520 L220 260 L400 520 Z" fill="${c1}"/><path d="M280 520 L500 140 L720 520 Z" fill="${c2}"/><path d="M560 520 L760 280 L960 520 Z" fill="${c1}"/>
        <path d="M450 220 L500 140 L560 250 L520 250 Z" fill="${c3}" opacity="0.85"/>
        <path d="M0 520 L960 540 L960 720 L0 720 Z" fill="${c0}" opacity="0.5"/>`;
    case "beach":
      return `${clouds}
        <rect x="0" y="360" width="960" height="200" fill="${c1}" opacity="0.55"/>
        <path d="M0 420 Q240 390 480 430 T960 410 L960 560 L0 560 Z" fill="${c2}" opacity="0.7"/>
        <path d="M0 560 L960 540 L960 720 L0 720 Z" fill="${c3}" opacity="0.8"/>
        <path d="M120 560 C130 480 170 470 180 560" fill="${c0}"/><ellipse cx="150" cy="470" rx="50" ry="24" fill="${c1}"/>
        <circle cx="780" cy="160" r="40" fill="${c3}" opacity="0.75"/>`;
    case "canyon":
      return `${clouds}
        <path d="M0 200 L200 200 L280 720 L0 720 Z" fill="${c0}"/>
        <path d="M960 180 L740 180 L660 720 L960 720 Z" fill="${c1}"/>
        <path d="M220 260 L480 400 L720 240 L680 720 L260 720 Z" fill="${c2}" opacity="0.85"/>
        <path d="M300 500 Q480 560 660 490" stroke="${c3}" stroke-width="14" fill="none" opacity="0.4"/>`;
    case "desert":
      return `${clouds}
        <circle cx="${700 + j(1) * 80}" cy="150" r="44" fill="${c3}" opacity="0.75"/>
        <path d="M0 480 Q180 400 360 470 T720 450 T960 500 L960 720 L0 720 Z" fill="${c2}"/>
        <path d="M0 560 Q240 500 480 580 T960 560 L960 720 L0 720 Z" fill="${c1}" opacity="0.85"/>
        <path d="M0 640 Q300 600 600 660 T960 640 L960 720 L0 720 Z" fill="${c0}" opacity="0.55"/>`;
    case "glacier":
      return `${clouds}
        <path d="M0 360 L200 220 L360 400 L520 160 L700 380 L860 200 L960 340 L960 720 L0 720 Z" fill="${c2}" opacity="0.55"/>
        <path d="M120 500 L300 360 L480 520 L640 340 L820 500 L960 420 L960 720 L0 720 Z" fill="${c3}" opacity="0.7"/>
        <path d="M0 600 Q480 560 960 620 L960 720 L0 720 Z" fill="${c1}" opacity="0.5"/>`;
    case "safari":
      return `${clouds}
        <path d="M0 480 L960 460 L960 720 L0 720 Z" fill="${c2}" opacity="0.55"/>
        <path d="M700 520 C710 400 780 390 790 520" fill="${c0}"/><ellipse cx="745" cy="390" rx="70" ry="30" fill="${c1}"/>
        <ellipse cx="260" cy="560" rx="70" ry="28" fill="${c0}" opacity="0.7"/>
        <circle cx="220" cy="530" r="22" fill="${c0}"/><circle cx="300" cy="535" r="18" fill="${c0}"/>
        <circle cx="780" cy="140" r="38" fill="${c3}" opacity="0.7"/>`;
    case "harbor":
      return `${clouds}
        <rect x="0" y="420" width="960" height="300" fill="${c1}" opacity="0.5"/>
        <path d="M0 460 Q240 430 480 470 T960 450 L960 720 L0 720 Z" fill="${c2}" opacity="0.55"/>
        <path d="M520 300 L620 420 L700 300 L780 440 L560 440 Z" fill="${c3}"/>
        <rect x="140" y="380" width="18" height="160" fill="${c0}"/><path d="M158 400 L260 380 L158 440 Z" fill="${c3}" opacity="0.7"/>
        <rect x="200" y="500" width="90" height="28" fill="${c0}" opacity="0.45"/>`;
    case "market":
      return `${clouds}${ground}
        ${[140, 280, 420, 560, 700]
          .map(
            (x, i) =>
              `<path d="M${x} 420 L${x + 90} 420 L${x + 80} 520 L${x + 10} 520 Z" fill="${i % 2 ? c2 : c3}"/><rect x="${x + 20}" y="520" width="60" height="40" fill="${c1}"/>`,
          )
          .join("")}
        <circle cx="200" cy="580" r="10" fill="${c3}"/><circle cx="480" cy="590" r="10" fill="${c2}"/><circle cx="760" cy="585" r="10" fill="${c3}"/>`;
    case "plaza":
      return `${clouds}${ground}
        <rect x="300" y="280" width="360" height="220" fill="${c2}"/>
        <rect x="330" y="310" width="60" height="120" fill="${c3}" opacity="0.8"/>
        <rect x="570" y="310" width="60" height="120" fill="${c3}" opacity="0.8"/>
        <circle cx="480" cy="520" r="48" fill="${c1}" opacity="0.5"/>
        <rect x="160" y="420" width="100" height="140" fill="${c1}"/><rect x="700" y="400" width="110" height="160" fill="${c1}"/>`;
    case "island":
      return `${clouds}
        <ellipse cx="480" cy="520" rx="280" ry="70" fill="${c1}" opacity="0.55"/>
        <path d="M260 500 Q480 360 700 500 Q480 560 260 500" fill="${c2}"/>
        <path d="M400 480 C410 400 470 390 480 480" fill="${c0}"/><ellipse cx="440" cy="400" rx="45" ry="20" fill="${c1}"/>
        <rect x="0" y="560" width="960" height="160" fill="${c2}" opacity="0.45"/>`;
    default:
      return `${clouds}${ground}
        <path d="M200 500 L350 280 L500 500 Z" fill="${c2}"/><rect x="520" y="320" width="160" height="200" fill="${c1}"/>
        <circle cx="600" cy="280" r="40" fill="${c3}" opacity="0.7"/>
        <path d="M120 560 Q480 600 840 540" stroke="${c3}" stroke-width="8" fill="none" opacity="0.45"/>`;
  }
}

function svgFor(opts: {
  id: string;
  name: string;
  country: string;
  region: string;
  tone: string;
  headline: string;
  num: number;
}) {
  const seed = hash(opts.id);
  const [c0, c1, c2, c3] = PALETTES[opts.tone] ?? PALETTES.stone;
  const scene = sceneOf(opts.name);
  const art = drawScene(scene, seed, c0, c1, c2, c3!);
  const title = opts.name.length > 16 ? `${opts.name.slice(0, 15)}…` : opts.name;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720" role="img" aria-label="${esc(opts.name)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c0}"/>
      <stop offset="55%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="vignette" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="40%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <rect width="960" height="720" fill="url(#sky)"/>
  ${art}
  <rect width="960" height="720" fill="url(#vignette)"/>
  <circle cx="900" cy="56" r="22" fill="#f5c518" opacity="0.95"/>
  <path d="M900 42l4.2 10.2 11 .9-8.4 7.3 2.5 10.7-9.3-5.4-9.3 5.4 2.5-10.7-8.4-7.3 11-.9z" fill="#fff8d6"/>
  <rect x="28" y="28" rx="18" ry="18" width="220" height="36" fill="#000" fill-opacity="0.28"/>
  <text x="46" y="52" fill="#fff" font-family="Georgia, 'Apple SD Gothic Neo', sans-serif" font-size="16" font-weight="700">${esc(opts.region)} · ${esc(opts.country)}</text>
  <text x="40" y="640" fill="#fff" font-family="Georgia, 'Apple SD Gothic Neo', serif" font-size="42" font-weight="700">${esc(title)}</text>
  <text x="42" y="678" fill="#fff" fill-opacity="0.88" font-family="system-ui, sans-serif" font-size="18">${esc(opts.headline.slice(0, 42))}${opts.headline.length > 42 ? "…" : ""}</text>
</svg>
`;
}

const outDir = path.resolve("public/landmarks");
fs.mkdirSync(outDir, { recursive: true });

let wrote = 0;
for (let i = 0; i < WORLD_LANDMARKS_200.length; i++) {
  const l = WORLD_LANDMARKS_200[i]!;
  const num = String(i + 1).padStart(3, "0");
  const svgPath = path.join(outDir, `lm-${num}.svg`);
  const jpgPath = path.join(outDir, `lm-${num}.jpg`);
  // Always refresh SVG fallback; keep existing AI jpg if present.
  fs.writeFileSync(
    svgPath,
    svgFor({
      id: l.id,
      name: l.name,
      country: l.country,
      region: l.region,
      tone: l.tone,
      headline: l.headline,
      num: i + 1,
    }),
  );
  wrote++;
  if (!fs.existsSync(jpgPath)) {
    // pointer file list for AI fill-in
  }
}

const manifest = WORLD_LANDMARKS_200.map((l, i) => {
  const num = String(i + 1).padStart(3, "0");
  const jpg = `lm-${num}.jpg`;
  const svg = `lm-${num}.svg`;
  const hasJpg = fs.existsSync(path.join(outDir, jpg));
  return {
    id: l.id,
    name: l.name,
    image: hasJpg ? `/landmarks/${jpg}` : `/landmarks/${svg}`,
    hasAi: hasJpg,
  };
});

fs.writeFileSync(
  path.resolve("scripts/data/landmark-images-manifest.json"),
  JSON.stringify(manifest, null, 2),
);

console.log(`Wrote ${wrote} SVG illustrations → ${outDir}`);
console.log(`AI jpg coverage: ${manifest.filter((m) => m.hasAi).length}/${manifest.length}`);
