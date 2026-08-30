"use server";

import { redirect } from "next/navigation";

import { clearRecoveryDeliveryCookie } from "@/lib/auth/recovery-delivery";

export async function acknowledgeRecoveryCode() {
  await clearRecoveryDeliveryCookie();
  redirect("/dashboard");
}
