import "server-only";

import { cookies } from "next/headers";

import { getUsernameSecrets } from "@/lib/auth/config";
import { openRecoveryDelivery, sealRecoveryDelivery } from "@/lib/auth/recovery";

export const RECOVERY_DELIVERY_COOKIE = "yuzheng_recovery_delivery";

export async function setRecoveryDeliveryCookie(code: string) {
  const { recoverySecret } = getUsernameSecrets();
  const store = await cookies();
  store.set(RECOVERY_DELIVERY_COOKIE, sealRecoveryDelivery(code, recoverySecret), {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/account/recovery-code",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readRecoveryDeliveryCookie() {
  const payload = (await cookies()).get(RECOVERY_DELIVERY_COOKIE)?.value;
  if (!payload) return null;
  const { recoverySecret } = getUsernameSecrets();
  return openRecoveryDelivery(payload, recoverySecret);
}

export async function clearRecoveryDeliveryCookie() {
  (await cookies()).set(RECOVERY_DELIVERY_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/account/recovery-code",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
