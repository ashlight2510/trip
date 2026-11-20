import { STATIC_UNAVAILABLE } from "@/lib/static-unavailable";

export type ContributeResult =
  | {
      ok: true;
      points: number;
      points_total: number;
      linked_count: number;
      message: string;
    }
  | { ok: false; error: string };

export async function contributeSource(_raw: unknown): Promise<ContributeResult> {
  return { ok: false, error: STATIC_UNAVAILABLE };
}

export async function getMyPoints(): Promise<{ points: number; linked_count: number }> {
  return { points: 0, linked_count: 0 };
}
