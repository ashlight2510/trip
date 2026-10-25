import { connection } from "next/server";
import { listMapAreasFast } from "@/db/map-query";

export async function GET() {
  await connection();
  const areas = listMapAreasFast();
  return Response.json({ areas });
}
