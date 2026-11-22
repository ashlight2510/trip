#!/usr/bin/env tsx
/**
 * yarn growth:hooks   — short hooks
 * yarn growth:week    — this week's 3 short hooks
 * yarn growth:posts   — this week's full blog/cafe paste drafts (preferred)
 */
import { formatHookForPost, GROWTH_HOOKS, thisWeekHooks } from "../src/lib/growth-hooks";
import { formatWeekBlogPosts } from "../src/lib/growth-posts";

const arg = process.argv.includes("--posts") || process.argv[2] === "posts"
  ? "posts"
  : process.argv.includes("--week") || process.argv[2] === "week"
    ? "week"
    : "all";

if (arg === "posts") {
  console.log(formatWeekBlogPosts());
  process.exit(0);
}

if (arg === "week") {
  const { week, year, slots } = thisWeekHooks();
  console.log(`\n📅 ${year}년 ${week}주차 · 짧은 훅 (전체 글은 yarn growth:posts)\n`);
  for (const { day, hook } of slots) {
    console.log(`──── ${day} · ${hook.channel} · ${hook.id} ────\n`);
    console.log(formatHookForPost(hook));
    console.log("");
  }
  process.exit(0);
}

for (const hook of GROWTH_HOOKS) {
  console.log(`\n===== ${hook.id} · ${hook.channel} =====\n`);
  console.log(formatHookForPost(hook));
}
