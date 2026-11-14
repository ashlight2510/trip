"use server";

export async function checkDhigaliAdmin(code: string) {
  const expected = process.env.DHIGALI_ADMIN_CODE || "260201";
  return code.trim() === expected;
}
