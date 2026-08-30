"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestMagicLink(formData: FormData) {
  const emailValue = formData.get("email");
  const email = typeof emailValue === "string" ? emailValue.trim() : "";

  if (!emailPattern.test(email)) redirect("/login?error=email");
  if (!getSupabasePublicEnv()) redirect("/login?error=config");

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.code ?? "send")}`);
  }

  redirect("/login?sent=1");
}

function readCredentials(formData: FormData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  return {
    email: typeof emailValue === "string" ? emailValue.trim() : "",
    password: typeof passwordValue === "string" ? passwordValue : "",
  };
}

export async function signInWithPassword(formData: FormData) {
  const { email, password } = readCredentials(formData);
  if (!emailPattern.test(email)) redirect("/login?mode=password&error=email");
  if (password.length < 8) redirect("/login?mode=password&error=password");
  if (!getSupabasePublicEnv()) redirect("/login?mode=password&error=config");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?mode=password&error=${encodeURIComponent(error.code ?? "credentials")}`);
  redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData) {
  const { email, password } = readCredentials(formData);
  if (!emailPattern.test(email)) redirect("/login?mode=signup&error=email");
  if (password.length < 8) redirect("/login?mode=signup&error=password");
  if (!getSupabasePublicEnv()) redirect("/login?mode=signup&error=config");

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
  });
  if (error) redirect(`/login?mode=signup&error=${encodeURIComponent(error.code ?? "signup")}`);
  if (data.session) redirect("/dashboard");
  redirect("/login?mode=signup&registered=1");
}
