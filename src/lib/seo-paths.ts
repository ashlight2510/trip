/** Client-safe URL helpers (no node:fs). */

export function seoLandingPath(slug: string): string {
  return `/explore/${slug}/`;
}

export function placeSeoPath(id: string): string {
  return `/p/${encodeURIComponent(id)}/`;
}
