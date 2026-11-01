import type { Place } from "../../src/db/schema";

type KakaoLike = {
  place_name: string;
  category_name: string;
  category_group_code?: string;
};

/**
 * Kakao Local → our place category.
 * Cafe/food group codes win over name tokens like "숲" so 숲카페 stays cafe.
 */
export function guessKakaoCategory(p: KakaoLike): Place["category"] {
  const text = `${p.place_name} ${p.category_name}`;
  const code = p.category_group_code ?? "";

  if (/해수욕장|해변/.test(text)) return "beach";
  if (/시장/.test(text)) return "market";
  if (code === "CE7" || /카페|커피|디저트|베이커리|브런치/.test(text)) return "cafe";
  if (code === "FD6" || /맛집|음식점|식당|레스토랑/.test(text)) return "restaurant";
  if (/공원/.test(text)) return "park";
  if (/숲|수목원|휴양림/.test(text)) return "forest";
  if (/전망대/.test(text)) return "viewpoint";
  if (/문화재|유적|고택|사찰|궁|한옥/.test(text)) return "heritage";
  if (/거리|골목/.test(text)) return "street";
  if (code === "AT4") return "landmark";
  return "landmark";
}
