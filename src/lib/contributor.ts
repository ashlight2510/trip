import { cookies } from "next/headers";

/** Read anonymous contributor cookie without creating one (safe in RSC). */
export async function peekContributorId() {
  const jar = await cookies();
  const existing = jar.get("pn_cid")?.value;
  if (existing && /^c-[a-z0-9]+$/.test(existing)) return existing;
  return null;
}

/** Ensure anonymous contributor cookie (`pn_cid`). Call from Server Actions only. */
export async function ensureContributorId() {
  const jar = await cookies();
  const existing = jar.get("pn_cid")?.value;
  if (existing && /^c-[a-z0-9]+$/.test(existing)) return existing;
  const id = `c-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  jar.set("pn_cid", id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return id;
}
