import { STATIC_UNAVAILABLE } from "@/lib/static-unavailable";

export type LikePlaceResult = {
  ok: true;
  likes: number;
  liked: boolean;
};

export async function likePlace(_raw: { place_id: string }): Promise<LikePlaceResult> {
  throw new Error(STATIC_UNAVAILABLE);
}
