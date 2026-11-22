#!/usr/bin/env tsx
/** Print this week's share hooks for Shorts/blog/cafe. */
import { formatHookForPost, GROWTH_HOOKS } from "../src/lib/growth-hooks";

for (const hook of GROWTH_HOOKS) {
  console.log(`\n===== ${hook.id} · ${hook.channel} =====\n`);
  console.log(formatHookForPost(hook));
}
