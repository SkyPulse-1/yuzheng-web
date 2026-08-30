"use server";

import { redirect } from "next/navigation";

import { getUsernameSecrets } from "@/lib/auth/config";
import { setRecoveryDeliveryCookie } from "@/lib/auth/recovery-delivery";
import { digestRecoveryCode, generateRecoveryCode } from "@/lib/auth/recovery";
import { deriveInternalEmail, validateUsername } from "@/lib/auth/username";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function readCredentials(formData: FormData) {
  const passwordValue = formData.get("password");
  const confirmationValue = formData.get("passwordConfirm");
  return {
    username: validateUsername(formData.get("username")),
    password: typeof passwordValue === "string" ? passwordValue : "",
    passwordConfirm: typeof confirmationValue === "string" ? confirmationValue : "",
  };
}

function ensurePublicConfiguration(mode: "password" | "signup") {
  if (!getSupabasePublicEnv()) redirect(`/login?mode=${mode}&error=config`);
  try {
    return getUsernameSecrets();
  } catch {
    redirect(`/login?mode=${mode}&error=config`);
  }
}

export async function signInWithUsername(formData: FormData) {
  const { username, password } = readCredentials(formData);
  if (!username.ok) redirect("/login?mode=password&error=username");
  if (password.length < 8) redirect("/login?mode=password&error=credentials");
  const { usernameSecret } = ensurePublicConfiguration("password");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: deriveInternalEmail(username.username, usernameSecret),
    password,
  });
  if (error) redirect("/login?mode=password&error=credentials");
  redirect("/dashboard");
}

export async function signUpWithUsername(formData: FormData) {
  const { username, password, passwordConfirm } = readCredentials(formData);
  if (!username.ok) redirect("/login?mode=signup&error=username");
  if (password.length < 8) redirect("/login?mode=signup&error=password");
  if (password !== passwordConfirm) redirect("/login?mode=signup&error=password_match");
  const { usernameSecret, recoverySecret } = ensurePublicConfiguration("signup");

  const recoveryCode = generateRecoveryCode();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: deriveInternalEmail(username.username, usernameSecret),
    password,
    options: {
      data: {
        username: username.username,
        recovery_digest: digestRecoveryCode(recoveryCode, recoverySecret),
      },
    },
  });

  if (error) {
    const duplicateCodes = new Set(["email_exists", "user_already_exists", "user_already_registered"]);
    redirect(`/login?mode=signup&error=${duplicateCodes.has(error.code ?? "") ? "username_taken" : "signup"}`);
  }
  if (!data.session) redirect("/login?mode=signup&error=confirmation");

  await setRecoveryDeliveryCookie(recoveryCode);
  redirect("/account/recovery-code");
}
