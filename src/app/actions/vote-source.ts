import { STATIC_UNAVAILABLE } from "@/lib/static-unavailable";

export type VoteSourceResult = {
  ok: true;
  score: number;
  hidden: boolean;
  my_vote: 1 | -1 | 0;
  hide_at: number;
};

export async function voteSource(_raw: {
  place_id: string;
  source_id: string;
  value: 1 | -1 | 0;
}): Promise<VoteSourceResult> {
  throw new Error(STATIC_UNAVAILABLE);
}
