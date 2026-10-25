import { connection } from "next/server";
import { getMapPlace } from "@/db/map-query";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await ctx.params;
  const place = getMapPlace(id);
  if (!place) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ place });
}
