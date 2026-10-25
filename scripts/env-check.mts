/**
 * Check which API keys are present (does not print secret values).
 *   npm run env:check
 */
import { loadEnv } from "./lib/store";

loadEnv();

const checks: { name: string; env: string; requiredFor: string }[] = [
  { name: "카카오 REST", env: "KAKAO_REST_API_KEY", requiredFor: "장소 수집 (npm run collect:kr)" },
  { name: "카카오 JS", env: "NEXT_PUBLIC_KAKAO_MAP_KEY", requiredFor: "국내 로드뷰" },
  { name: "네이버 Client ID", env: "NAVER_CLIENT_ID", requiredFor: "블로그 후기 3개 (API HUB)" },
  { name: "네이버 Secret", env: "NAVER_CLIENT_SECRET", requiredFor: "블로그 후기 3개 (API HUB)" },
  { name: "구글 Maps", env: "NEXT_PUBLIC_GOOGLE_MAPS_KEY", requiredFor: "해외 스트리트뷰 (선택)" },
];

let missing = 0;
console.log("풍경너머 API 키 상태\n");
for (const c of checks) {
  const v = process.env[c.env];
  const ok = Boolean(v && v.trim());
  if (!ok) missing++;
  console.log(`${ok ? "✓" : "✗"} ${c.name.padEnd(16)} ${ok ? "설정됨" : "없음"}  — ${c.requiredFor}`);
}

console.log("");
if (missing === 0) {
  console.log("필수·선택 키 모두 있어요. 수집을 시작할 수 있습니다.");
  console.log("  npm run collect:kr -- --city kr-gangneung");
  console.log('  npm run region:link -- kr-gangneung --query "강릉 여행"');
} else {
  console.log(`${missing}개 비어 있습니다. .env.local.example 을 복사해 값을 채우세요:`);
  console.log("  cp .env.local.example .env.local");
  console.log("발급 안내: 채팅에 적어 둔 카카오 / 네이버 / 구글 순서를 따라가면 됩니다.");
  process.exitCode = 1;
}
