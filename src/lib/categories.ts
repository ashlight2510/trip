import type { Place } from "@/db/schema";

export const categoryLabel: Record<Place["category"], string> = {
  beach: "해변",
  cafe: "카페",
  forest: "숲",
  market: "시장",
  heritage: "문화유산",
  landmark: "명소",
  restaurant: "맛집",
  park: "공원",
  street: "거리",
  viewpoint: "전망",
};

/** Marker fill colors — cool coastal palette, not purple/cream AI defaults. */
export const categoryColor: Record<Place["category"], string> = {
  beach: "#2a7f9e",
  cafe: "#b06a3a",
  forest: "#3f6b45",
  market: "#a85c2e",
  heritage: "#6b5344",
  landmark: "#355c7d",
  restaurant: "#9a4e3a",
  park: "#4a7c59",
  street: "#5c6b73",
  viewpoint: "#3d6e8a",
};

/**
 * White-on-color glyphs (viewBox 0 0 24 24).
 * Simple silhouettes so markers stay readable at map scale.
 */
export const categoryGlyph: Record<Place["category"], string> = {
  beach:
    '<path d="M3 16c2.2-1.6 4.3-2.4 6.5-2.4S13.8 14.4 16 16c2 1.4 3.7 2 5.5 2v2.2c-2.2 0-4.3-.8-6.5-2.2-2.2-1.5-4.3-2.2-6.5-2.2S4.2 16.5 2 18V16c.3-.1.7-.2 1-.3Z" fill="currentColor"/><path d="M5 11.2c.9-1.6 2.3-2.6 4-2.6 1.5 0 2.7.7 3.6 1.8.4-.7 1-1.3 1.7-1.7.9-.5 1.9-.7 3-.5.3 1.8-.3 3.3-1.5 4.4-1.4 1.3-3.3 1.7-5.1 1.2-1.9-.5-3.4-1.8-4.2-3.5-.3-.6-.5-1.2-.5-1.8Z" fill="currentColor"/>',
  cafe:
    '<path d="M5 8h10.5a3.5 3.5 0 0 1 0 7H17v1.5A3.5 3.5 0 0 1 13.5 20h-5A3.5 3.5 0 0 1 5 16.5V8Zm10.5 5H15V10h.5a1.5 1.5 0 0 1 0 3ZM8 4.5c0-.8.6-1.2 1.2-.9.5.2.8.8.8 1.5S9.7 6.7 9.2 7C8.6 7.2 8 6.8 8 6V4.5Zm3.2 0c0-.8.6-1.2 1.2-.9.5.2.8.8.8 1.5s-.3 1.6-.8 1.9c-.6.2-1.2-.2-1.2-1V4.5Z" fill="currentColor"/>',
  forest:
    '<path d="M12 3.5 7.2 11h2.1L5.5 17h4.2v3.5h4.6V17h4.2L14.7 11h2.1L12 3.5Z" fill="currentColor"/>',
  market:
    '<path d="M4.5 9.5 6 5h12l1.5 4.5H4.5ZM5 11h14v8.5H5V11Zm3 2.2v4.1h2.2v-4.1H8Zm5.8 0v4.1H16v-4.1h-2.2Z" fill="currentColor"/>',
  heritage:
    '<path d="M4 19.5h16v-1.6H4v1.6Zm1.2-3.2h13.6l-.8-2.2H6l-.8 2.2Zm1.5-3.8h10.6L16 9.8H8l-1.3 2.7ZM9 9h6l-.7-1.8H9.7L9 9Zm1.2-3.3h3.6L13 4.2h-2l-.8 1.5Z" fill="currentColor"/>',
  landmark:
    '<path d="M12 3.2 5.5 7v3.2h13V7L12 3.2ZM7 11.5v5.2H5.2V20h13.6v-3.3H17v-5.2H7Zm2.2 0h5.6v5.2H9.2v-5.2Z" fill="currentColor"/>',
  restaurant:
    '<path d="M7.2 4.2c.7 0 1.3.9 1.3 2.2V11h1.3V4.8c0-1.3.5-2.2 1.2-2.2s1.2.9 1.2 2.2V11h1.3V6.4c0-1.3.6-2.2 1.3-2.2.6 0 1.1.7 1.1 1.8V12c0 1.5-.8 2.5-2 2.8V20H9.2v-5.2c-1.2-.3-2-1.3-2-2.8V6c0-1.1.5-1.8 1.1-1.8ZM17.2 4.5c1.6 1.2 2.5 3.2 2.5 5.5 0 2.1-.8 3.8-2.1 4.9V20h-2.1v-5.1c-1.3-1.1-2.1-2.8-2.1-4.9 0-2.3.9-4.3 2.5-5.5l1.3 1.6Z" fill="currentColor"/>',
  park:
    '<path d="M12 4c-2.8 0-5 2.4-5 5.3 0 2.2 1.2 4 3 5l-.4 5.2h4.8l-.4-5.2c1.8-1 3-2.8 3-5C17 6.4 14.8 4 12 4Zm-1.1 15.5h2.2V21h-2.2v-1.5Z" fill="currentColor"/>',
  street:
    '<path d="M10.2 3.5h3.6v17h-3.6v-17ZM5 7.2h3.2v2.2H5V7.2Zm10.8 0H19v2.2h-3.2V7.2ZM5 12.4h3.2v2.2H5v-2.2Zm10.8 0H19v2.2h-3.2v-2.2Z" fill="currentColor"/>',
  viewpoint:
    '<path d="M12 5.5 4.8 17.5h14.4L12 5.5Zm0 3.4 3.6 6.1H8.4L12 8.9ZM6.5 19.2h11v1.6h-11v-1.6Z" fill="currentColor"/>',
};

export function categoryIconSvg(category: Place["category"], size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="display:block;color:#fff">${categoryGlyph[category]}</svg>`;
}
