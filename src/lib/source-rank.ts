/** Shared sort key for place sources: manual boost first, then API relevance / views. */
export function sourceSortKey(input: {
  boost: number;
  relevance: number;
  view_count: number | null;
  rank: number;
}): number[] {
  return [input.boost, input.relevance, input.view_count ?? 0, -input.rank];
}

export function compareSourceSort(
  a: { boost: number; relevance: number; view_count: number | null; rank: number },
  b: { boost: number; relevance: number; view_count: number | null; rank: number },
): number {
  const ka = sourceSortKey(a);
  const kb = sourceSortKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i]! !== kb[i]!) return kb[i]! - ka[i]!;
  }
  return 0;
}
