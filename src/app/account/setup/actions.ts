"use server";

import { redirect } from "next/navigation";

import { getUsernameAuthConfig } from "@/lib/auth/config";
import { setRecoveryDeliveryCookie } from "@/lib/auth/recovery-delivery";
import { digestRecoveryCode, generateRecoveryCode } from "@/lib/auth/recovery";
import { deriveInternalEmail, validateUsername } from "@/lib/auth/username";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function setupError(code: string): never {
  redirect(`/account/setup?error=${code}`);
}

export async function setupUsernameForCurrentUser(formData: FormData) {
  const username = validateUsername(formData.get("username"));
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const passwordConfirm = typeof formData.get("passwordConfirm") === "string" ? String(formData.get("passwordConfirm")) : "";
  if (!username.ok) setupError("username");
  if (password.length < 8) setupError("password");
  if (password !== passwordConfirm) setupError("password_match");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  let config: ReturnType<typeof getUsernameAuthConfig>;
  try {
    config = getUsernameAuthConfig();
  } catch {
    setupError("config");
  }
  const admin = createAdminClient();
  const [{ data: existingProfile }, { data: existingRecovery }, { data: occupied }] = await Promise.all([
    admin.from("profiles").select("username_normalized").eq("id", auth.user.id).maybeSingle(),
    admin.from("account_recovery").select("user_id").eq("user_id", auth.user.id).maybeSingle(),
    admin.from("profiles").select("id").eq("username_normalized", username.username).neq("id", auth.user.id).maybeSingle(),
  ]);
  if (occupied) setupError("username_taken");
  if (existingProfile && existingProfile.username_normalized !== username.username) setupError("already_setup");
  if (existingProfile && existingRecovery) redirect("/dashboard");

  const recoveryCode = generateRecoveryCode();
  const recoveryDigest = digestRecoveryCode(recoveryCode, config.recoverySecret);
  const { error: authError } = await admin.auth.admin.updateUserById(auth.user.id, {
    email: deriveInternalEmail(username.username, config.usernameSecret),
    email_confirm: true,
    password,
    user_metadata: { ...auth.user.user_metadata, username: username.username },
  });
  if (authError) setupError("migration");

  const { error: recoveryError } = await admin.from("account_recovery").upsert({
    user_id: auth.user.id,
    recovery_digest: recoveryDigest,
    failed_attempts: 0,
    locked_until: null,
    rotated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (recoveryError) setupError("migration");

  const { error: profileError } = await admin.from("profiles").upsert({
    id: auth.user.id,
    username: username.username,
    username_normalized: username.username,
  }, { onConflict: "id" });
  if (profileError) setupError(profileError.code === "23505" ? "username_taken" : "migration");

  await setRecoveryDeliveryCookie(recoveryCode);
  redirect("/account/recovery-code");
}
