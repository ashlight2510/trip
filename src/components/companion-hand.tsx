"use client";

import type { CSSProperties, ReactNode } from "react";

export type CompanionKind =
  | "alone"
  | "hand-male"
  | "hand-female"
  | "anime"
  | "movie"
  | "cute"
  | "puppy"
  | "kitty";

export const COMPANIONS: {
  id: CompanionKind;
  label: string;
  hint: string;
  group: "solo" | "hand" | "style" | "pet";
}[] = [
  { id: "alone", label: "혼자", hint: "나만의 속도로", group: "solo" },
  { id: "hand-male", label: "남자 손", hint: "따뜻하게 손잡고", group: "hand" },
  { id: "hand-female", label: "여자 손", hint: "살며시 손잡고", group: "hand" },
  { id: "anime", label: "애니", hint: "또렷한 라인 · 큰 손", group: "style" },
  { id: "movie", label: "영화", hint: "시네마틱 · 사실감", group: "style" },
  { id: "cute", label: "귀여운", hint: "동글동글 소프트", group: "style" },
  { id: "puppy", label: "강아지", hint: "앞발 꼭 잡고", group: "pet" },
  { id: "kitty", label: "고양이", hint: "냥이 발 살포시", group: "pet" },
];

const YOURS = { fill: "#d8a882", stroke: "#a56b45", knuckle: "#c9926c", nail: "#e8c4a8" };

function defsCommon() {
  return (
    <defs>
      <linearGradient id="skinY" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#efc9a8" />
        <stop offset="100%" stopColor="#d4a07a" />
      </linearGradient>
      <linearGradient id="skinM" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d4a07a" />
        <stop offset="100%" stopColor="#b07a52" />
      </linearGradient>
      <linearGradient id="skinF" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f0cbb0" />
        <stop offset="100%" stopColor="#e0a888" />
      </linearGradient>
      <linearGradient id="skinAnime" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffe0c8" />
        <stop offset="100%" stopColor="#f0b898" />
      </linearGradient>
      <linearGradient id="skinCute" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffd6c4" />
        <stop offset="100%" stopColor="#f5b8a0" />
      </linearGradient>
      <linearGradient id="furPup" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e8c48a" />
        <stop offset="100%" stopColor="#c49248" />
      </linearGradient>
      <linearGradient id="furKit" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f2ece4" />
        <stop offset="100%" stopColor="#d4c8ba" />
      </linearGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="b" />
        <feOffset dy="3" result="o" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.35" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

/** Your right hand reaching from bottom-right (shared base). */
function YourHand({
  fill = "url(#skinY)",
  stroke = YOURS.stroke,
  nail = YOURS.nail,
  scale = 1,
}: {
  fill?: string;
  stroke?: string;
  nail?: string;
  scale?: number;
}) {
  return (
    <g transform={`translate(${480 - 480 * scale},${220 - 220 * scale}) scale(${scale})`} filter="url(#soft)">
      {/* forearm */}
      <path
        d="M455 220 C448 175 430 145 395 125 C370 110 340 108 315 122 C295 135 280 155 275 178 L272 220 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* palm */}
      <path
        d="M318 128 C295 118 268 125 252 145 C238 165 240 190 255 205 C275 222 310 218 330 200 C345 186 350 165 342 148 C337 138 328 132 318 128 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.8"
      />
      {/* thumb */}
      <path
        d="M330 155 C350 148 368 155 372 175 C375 190 365 202 348 200 C335 198 325 185 328 170 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.6"
      />
      <ellipse cx="365" cy="188" rx="7" ry="5" fill={nail} opacity="0.85" />
      {/* fingers curled over partner */}
      <path
        d="M255 148 C248 125 255 108 268 102 C278 112 280 130 276 148"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
      />
      <path
        d="M272 142 C270 118 280 100 295 96 C302 108 302 128 298 145"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
      />
      <path
        d="M292 140 C295 116 308 98 322 98 C326 112 322 132 316 148"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
      />
      <path
        d="M312 145 C318 122 332 108 345 112 C346 128 338 145 328 158"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
      />
      {/* nails */}
      <ellipse cx="265" cy="108" rx="5" ry="3.5" fill={nail} opacity="0.9" transform="rotate(-20 265 108)" />
      <ellipse cx="292" cy="100" rx="5" ry="3.5" fill={nail} opacity="0.9" transform="rotate(-8 292 100)" />
      <ellipse cx="318" cy="102" rx="5" ry="3.5" fill={nail} opacity="0.9" transform="rotate(5 318 102)" />
      <ellipse cx="340" cy="116" rx="4.5" ry="3" fill={nail} opacity="0.9" transform="rotate(18 340 116)" />
      {/* knuckle shade */}
      <path d="M270 155 Q290 148 320 155" fill="none" stroke={stroke} strokeWidth="1" opacity="0.25" />
      <ellipse cx="300" cy="175" rx="22" ry="10" fill="rgba(255,255,255,.2)" />
    </g>
  );
}

function PartnerHumanHand({
  fill,
  stroke,
  nail,
  slender = false,
}: {
  fill: string;
  stroke: string;
  nail: string;
  slender?: boolean;
}) {
  const sx = slender ? 0.92 : 1;
  return (
    <g transform={`translate(${slender ? 18 : 0},0) scale(${sx},1)`} filter="url(#soft)">
      <path
        d="M28 220 C35 168 55 130 95 108 C125 92 160 95 190 118 C210 135 222 160 220 188 L218 220 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M168 115 C145 95 115 92 95 108 C78 122 75 150 88 172 C105 198 145 205 175 190 C195 178 205 155 198 135 C194 124 182 116 168 115 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.8"
      />
      {/* fingers reaching right into clasp */}
      <path
        d="M175 125 C195 110 218 112 228 130 C230 145 218 158 200 155 C185 152 175 140 175 125 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <path
        d="M188 118 C205 95 228 92 242 110 C248 125 238 140 220 138 C205 136 190 128 188 118 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
      />
      <path
        d="M200 112 C215 88 240 88 252 108 C256 122 245 136 228 132 C214 128 202 120 200 112 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
      />
      <path
        d="M210 108 C222 85 248 88 258 108 C260 122 248 134 232 128 C220 124 212 116 210 108 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.3"
      />
      <ellipse cx="235" cy="128" rx="5.5" ry="3.5" fill={nail} opacity="0.9" transform="rotate(25 235 128)" />
      <ellipse cx="245" cy="118" rx="5" ry="3.2" fill={nail} opacity="0.9" transform="rotate(15 245 118)" />
      <ellipse cx="252" cy="114" rx="4.8" ry="3" fill={nail} opacity="0.9" transform="rotate(8 252 114)" />
      <ellipse cx="255" cy="112" rx="4.2" ry="2.8" fill={nail} opacity="0.85" />
      <ellipse cx="155" cy="155" rx="20" ry="9" fill="rgba(255,255,255,.18)" />
    </g>
  );
}

function AnimeHands() {
  return (
    <g filter="url(#soft)">
      {/* partner — big soft anime hand */}
      <path
        d="M20 220 C40 150 80 110 140 100 C185 92 230 115 250 155 C258 175 250 200 230 215 L220 220 Z"
        fill="url(#skinAnime)"
        stroke="#e8a888"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse cx="200" cy="140" rx="55" ry="42" fill="url(#skinAnime)" stroke="#e8a888" strokeWidth="2.2" />
      {/* chunky fingers */}
      {[
        [165, 105, -25],
        [190, 95, -10],
        [215, 95, 5],
        [238, 105, 22],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x},${y}) rotate(${r})`}>
          <rect x="-12" y="-36" width="24" height="48" rx="12" fill="url(#skinAnime)" stroke="#e8a888" strokeWidth="2" />
          <ellipse cx="0" cy="-32" rx="9" ry="7" fill="#ffc8d8" />
        </g>
      ))}
      <ellipse cx="255" cy="155" rx="22" ry="18" fill="url(#skinAnime)" stroke="#e8a888" strokeWidth="2" />
      {/* yours */}
      <path
        d="M460 220 C440 155 400 115 340 105 C295 98 255 120 240 155 C232 175 245 200 270 212 L280 220 Z"
        fill="url(#skinAnime)"
        stroke="#e8a888"
        strokeWidth="2.5"
      />
      <ellipse cx="290" cy="145" rx="50" ry="40" fill="url(#skinAnime)" stroke="#e8a888" strokeWidth="2.2" />
      {[
        [260, 108, -20],
        [285, 98, -5],
        [310, 100, 12],
        [332, 112, 28],
      ].map(([x, y, r], i) => (
        <g key={`y${i}`} transform={`translate(${x},${y}) rotate(${r})`}>
          <rect x="-11" y="-34" width="22" height="46" rx="11" fill="url(#skinAnime)" stroke="#e8a888" strokeWidth="2" />
          <ellipse cx="0" cy="-30" rx="8" ry="6" fill="#ffc8d8" />
        </g>
      ))}
      {/* sparkle */}
      <path d="M300 70 L304 82 L316 86 L304 90 L300 102 L296 90 L284 86 L296 82 Z" fill="#fff6a8" opacity="0.9" />
      <circle cx="250" cy="165" r="14" fill="rgba(255,255,255,.35)" />
    </g>
  );
}

function CuteHands() {
  return (
    <g filter="url(#soft)">
      <ellipse cx="175" cy="175" rx="95" ry="70" fill="url(#skinCute)" stroke="#f0a890" strokeWidth="2" />
      <ellipse cx="310" cy="170" rx="90" ry="68" fill="url(#skinCute)" stroke="#f0a890" strokeWidth="2" />
      {/* sausage fingers interlocking */}
      {[140, 165, 190, 215].map((x, i) => (
        <ellipse key={i} cx={x} cy={120 - (i % 2) * 6} rx="18" ry="32" fill="url(#skinCute)" stroke="#f0a890" strokeWidth="1.8" />
      ))}
      {[270, 295, 320, 345].map((x, i) => (
        <ellipse key={`r${i}`} cx={x} cy={118 - (i % 2) * 5} rx="17" ry="30" fill="url(#skinCute)" stroke="#f0a890" strokeWidth="1.8" />
      ))}
      {/* blush */}
      <ellipse cx="200" cy="185" rx="28" ry="12" fill="#ff9aaa" opacity="0.35" />
      <ellipse cx="295" cy="180" rx="26" ry="11" fill="#ff9aaa" opacity="0.35" />
      {/* hearts */}
      <path
        d="M240 95 C240 88 248 82 255 88 C262 82 270 88 270 95 C270 108 255 118 255 118 C255 118 240 108 240 95 Z"
        fill="#ff7a9a"
        opacity="0.85"
      />
      <circle cx="245" cy="160" r="16" fill="rgba(255,255,255,.4)" />
    </g>
  );
}

function MovieHands() {
  return (
    <>
      <PartnerHumanHand fill="url(#skinM)" stroke="#8f5e3c" nail="#c48a68" />
      <YourHand fill="url(#skinY)" stroke="#8f5e3c" nail="#e0b898" />
      {/* cinematic vignette light on knuckles */}
      <ellipse cx="240" cy="150" rx="70" ry="28" fill="rgba(255,220,180,.12)" />
      <path d="M200 200 Q240 185 280 200" fill="none" stroke="#5a3820" strokeWidth="1.2" opacity="0.2" />
    </>
  );
}

function PuppyPaw() {
  return (
    <g filter="url(#soft)">
      {/* forearm fur */}
      <path
        d="M40 220 C50 160 80 120 130 105 C165 95 200 110 220 145 C230 165 225 195 210 215 L200 220 Z"
        fill="url(#furPup)"
        stroke="#a87838"
        strokeWidth="2"
      />
      {/* paw pad */}
      <ellipse cx="195" cy="145" rx="58" ry="50" fill="url(#furPup)" stroke="#a87838" strokeWidth="2" />
      {/* toe beans */}
      <ellipse cx="165" cy="115" rx="14" ry="18" fill="#c9a06a" stroke="#a87838" strokeWidth="1.5" />
      <ellipse cx="190" cy="105" rx="14" ry="18" fill="#c9a06a" stroke="#a87838" strokeWidth="1.5" />
      <ellipse cx="215" cy="110" rx="13" ry="17" fill="#c9a06a" stroke="#a87838" strokeWidth="1.5" />
      <ellipse cx="235" cy="125" rx="12" ry="15" fill="#c9a06a" stroke="#a87838" strokeWidth="1.5" />
      {/* main pad */}
      <ellipse cx="198" cy="155" rx="28" ry="22" fill="#b88858" stroke="#8a6030" strokeWidth="1.5" />
      <ellipse cx="188" cy="148" rx="8" ry="5" fill="rgba(255,255,255,.25)" />
      {/* ear peek optional fluff */}
      <ellipse cx="120" cy="130" rx="10" ry="6" fill="#f0d8a8" opacity="0.5" transform="rotate(-30 120 130)" />
      <YourHand />
      {/* little nose hint on wrist fluff */}
      <circle cx="230" cy="95" r="3" fill="#5a3a20" opacity="0.35" />
    </g>
  );
}

function KittyPaw() {
  return (
    <g filter="url(#soft)">
      <path
        d="M45 220 C55 165 85 125 135 110 C170 98 205 112 225 148 C235 168 228 198 212 216 L200 220 Z"
        fill="url(#furKit)"
        stroke="#b8a898"
        strokeWidth="2"
      />
      <ellipse cx="195" cy="148" rx="55" ry="48" fill="url(#furKit)" stroke="#b8a898" strokeWidth="2" />
      {/* pink beans */}
      <ellipse cx="168" cy="120" rx="12" ry="16" fill="#f5b0c0" stroke="#d88898" strokeWidth="1.3" />
      <ellipse cx="192" cy="110" rx="12" ry="16" fill="#f5b0c0" stroke="#d88898" strokeWidth="1.3" />
      <ellipse cx="216" cy="116" rx="11" ry="15" fill="#f5b0c0" stroke="#d88898" strokeWidth="1.3" />
      <ellipse cx="235" cy="132" rx="10" ry="13" fill="#f5b0c0" stroke="#d88898" strokeWidth="1.3" />
      <ellipse cx="198" cy="158" rx="26" ry="20" fill="#ef9aab" stroke="#d07088" strokeWidth="1.4" />
      {/* stripes */}
      <path d="M150 145 Q160 155 155 170" fill="none" stroke="#c8b8a8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <path d="M170 175 Q185 180 175 195" fill="none" stroke="#c8b8a8" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <YourHand fill="url(#skinF)" stroke="#c48a6a" nail="#f0c8c0" />
    </g>
  );
}

function sceneFor(kind: CompanionKind): ReactNode {
  switch (kind) {
    case "hand-male":
      return (
        <>
          <PartnerHumanHand fill="url(#skinM)" stroke="#9a6b45" nail="#c99574" />
          <YourHand />
        </>
      );
    case "hand-female":
      return (
        <>
          <PartnerHumanHand fill="url(#skinF)" stroke="#c48a6a" nail="#f0c4c8" slender />
          <YourHand fill="url(#skinF)" stroke="#c48a6a" nail="#f0c8c0" />
        </>
      );
    case "anime":
      return <AnimeHands />;
    case "movie":
      return <MovieHands />;
    case "cute":
      return <CuteHands />;
    case "puppy":
      return <PuppyPaw />;
    case "kitty":
      return <KittyPaw />;
    default:
      return null;
  }
}

/** Tiny preview glyph for pickers. */
export function CompanionPreview({ kind }: { kind: CompanionKind }) {
  if (kind === "alone") {
    return <span className="text-lg leading-none">🧍</span>;
  }
  const map: Record<Exclude<CompanionKind, "alone">, string> = {
    "hand-male": "🤝",
    "hand-female": "🤲",
    anime: "✨",
    movie: "🎬",
    cute: "💕",
    puppy: "🐶",
    kitty: "🐱",
  };
  return <span className="text-lg leading-none">{map[kind]}</span>;
}

/** First-person clasped companion at the bottom of 거리뷰. */
export function CompanionHandOverlay({
  kind,
  heading = 0,
}: {
  kind: CompanionKind;
  heading?: number;
}) {
  if (kind === "alone") return null;

  const sway = Math.sin((heading * Math.PI) / 180) * 7;
  const art = sceneFor(kind);
  if (!art) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[450] flex justify-center overflow-hidden"
      aria-hidden
    >
      <div
        className="animate-companion-walk w-[min(100vw,32rem)] origin-bottom select-none will-change-transform"
        style={{ ["--hand-sway"]: `${sway}px` } as CSSProperties}
      >
        <svg viewBox="0 0 480 220" className="h-auto w-full drop-shadow-[0_-10px_28px_rgba(0,0,0,.5)]">
          {defsCommon()}
          {art}
        </svg>
      </div>
    </div>
  );
}
