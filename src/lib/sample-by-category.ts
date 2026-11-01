/**
 * Round-robin across categories so a hard cap (map pins / API limit)
 * does not erase minority categories when the input order is biased.
 * Optional rankOf sorts each category bucket descending (higher first).
 */
export function sampleByCategory<T>(
  items: readonly T[],
  cap: number,
  categoryOf: (item: T) => string,
  rankOf?: (item: T) => number,
): T[] {
  if (cap <= 0) return [];
  if (items.length <= cap) {
    if (!rankOf) return [...items];
    return [...items].sort((a, b) => rankOf(b) - rankOf(a));
  }

  const buckets = new Map<string, T[]>();
  const order: string[] = [];
  for (const item of items) {
    const cat = categoryOf(item);
    let bucket = buckets.get(cat);
    if (!bucket) {
      bucket = [];
      buckets.set(cat, bucket);
      order.push(cat);
    }
    bucket.push(item);
  }

  if (rankOf) {
    for (const cat of order) {
      buckets.get(cat)!.sort((a, b) => rankOf(b) - rankOf(a));
    }
  }

  const out: T[] = [];
  let depth = 0;
  while (out.length < cap) {
    let added = false;
    for (const cat of order) {
      const item = buckets.get(cat)?.[depth];
      if (item === undefined) continue;
      out.push(item);
      added = true;
      if (out.length >= cap) break;
    }
    if (!added) break;
    depth++;
  }
  return out;
}
