#!/usr/bin/env tsx
/**
 * yarn growth:hooks        — all hooks
 * yarn growth:week         — this week's Mon/Wed/Fri 3 posts (copy-paste)
 */
import { formatHookForPost, GROWTH_HOOKS, thisWeekHooks } from "../src/lib/growth-hooks";

const mode = process.argv.includes("--week") || process.argv[2] === "week" ? "week" : "all";

if (mode === "week") {
  const { week, year, slots } = thisWeekHooks();
  console.log(`\n📅 ${year}년 ${week}주차 · 주 3회 배포 (복붙)\n`);
  console.log("채널 가이드: Shorts=유튜브/릴스 · blog=네이버블로그 · cafe=카페 글\n");
  for (const { day, hook } of slots) {
    console.log(`──── ${day}요일 · ${hook.channel.toUpperCase()} · ${hook.id} ────\n`);
    console.log(formatHookForPost(hook));
    console.log("");
  }
  console.log("체크: 영상/글 끝에 URL 고정 · 썸네일에 ‘후기 지도’ · 같은 훅 주 1회만\n");
  process.exit(0);
}

for (const hook of GROWTH_HOOKS) {
  console.log(`\n===== ${hook.id} · ${hook.channel} =====\n`);
  console.log(formatHookForPost(hook));
}
