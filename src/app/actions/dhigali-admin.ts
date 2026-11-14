"use server";

export async function checkDhigaliAdmin(code: string) {
  const expected = process.env.DHIGALI_ADMIN_CODE || "dhigali";
  return code.trim() === expected;
}
