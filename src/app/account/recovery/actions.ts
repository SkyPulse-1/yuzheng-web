"use server";

import { redirect } from "next/navigation";

import { getUsernameAuthConfig } from "@/lib/auth/config";
import { setRecoveryDeliveryCookie } from "@/lib/auth/recovery-delivery";
import { digestRecoveryCode, generateRecoveryCode, recoveryCodeMatches } from "@/lib/auth/recovery";
import { validateUsername } from "@/lib/auth/username";
import { createAdminClient } from "@/lib/supabase/admin";

function recoveryError(code: string): never {
  redirect(`/account/recovery?error=${code}`);
}

export async function recoverAccount(formData: FormData) {
  const username = validateUsername(formData.get("username"));
  const recoveryCode = typeof formData.get("recoveryCode") === "string" ? String(formData.get("recoveryCode")) : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const passwordConfirm = typeof formData.get("passwordConfirm") === "string" ? String(formData.get("passwordConfirm")) : "";

  if (!username.ok) recoveryError("recovery");
  if (password.length < 8) recoveryError("password");
  if (password !== passwordConfirm) recoveryError("password_match");

  let config: ReturnType<typeof getUsernameAuthConfig>;
  try {
    config = getUsernameAuthConfig();
  } catch {
    recoveryError("config");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username_normalized", username.username)
    .maybeSingle();

  if (!profile) {
    recoveryCodeMatches(recoveryCode, "0".repeat(64), config.recoverySecret);
    recoveryError("recovery");
  }

  const { data: state } = await admin
    .from("account_recovery")
    .select("recovery_digest, failed_attempts, locked_until")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!state) recoveryError("recovery");
  if (state.locked_until && new Date(state.locked_until).getTime() > Date.now()) recoveryError("locked");

  if (!recoveryCodeMatches(recoveryCode, state.recovery_digest, config.recoverySecret)) {
    const { data: failureState } = await admin.rpc("record_recovery_failure", { target_user_id: profile.id }).maybeSingle();
    const failureRow = failureState as { current_failed_attempts?: number } | null;
    const failedAttempts = failureRow?.current_failed_attempts ?? Math.min(5, state.failed_attempts + 1);
    recoveryError(failedAttempts >= 5 ? "locked" : "recovery");
  }

  const { error: passwordError } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (passwordError) recoveryError("reset");

  const nextCode = generateRecoveryCode();
  const { error: rotateError } = await admin
    .from("account_recovery")
    .update({
      failed_attempts: 0,
      locked_until: null,
      recovery_digest: digestRecoveryCode(nextCode, config.recoverySecret),
      rotated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.id);
  if (rotateError) {
    await admin
      .from("account_recovery")
      .update({ failed_attempts: 5, locked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
      .eq("user_id", profile.id);
    recoveryError("reset");
  }

  await setRecoveryDeliveryCookie(nextCode);
  redirect("/account/recovery-code");
}
