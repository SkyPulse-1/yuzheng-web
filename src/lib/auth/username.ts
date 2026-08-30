import { createHmac } from "node:crypto";

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validateUsername(value: unknown):
  | { ok: true; username: string }
  | { ok: false; error: string } {
  const username = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(username)) {
    return { ok: false, error: "用户名需为 3–24 位英文、数字或下划线。" };
  }
  return { ok: true, username };
}

export function deriveInternalEmail(username: string, secret: string) {
  if (secret.length < 32) throw new Error("Username authentication is not configured.");
  const digest = createHmac("sha256", secret).update(normalizeUsername(username)).digest("hex");
  return `u_${digest}@auth.yuzheng.invalid`;
}
