import { redirect } from "next/navigation";

import { setupUsernameForCurrentUser } from "@/app/account/setup/actions";
import { PasswordField } from "@/app/login/password-field";
import { SubmitButton } from "@/app/login/submit-button";
import { createClient } from "@/lib/supabase/server";

const errorMessages: Record<string, string> = {
  already_setup: "这个账号已经设置过用户名。",
  config: "用户名服务尚未配置完成，请稍后再试。",
  migration: "账号升级失败，请稍后重试。你的原有数据没有被删除。",
  password: "密码至少需要 8 个字符。",
  password_match: "两次输入的密码不一致。",
  username: "用户名需为 3–24 位英文、数字或下划线。",
  username_taken: "这个用户名已经被使用，请换一个。",
};

export default async function AccountSetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", auth.user.id).maybeSingle();
  if (profile) redirect("/dashboard");
  const { error = "" } = await searchParams;

  return (
    <main className="min-h-screen px-5 py-10 text-ink">
      <section className="reading-room-section mx-auto mt-4 max-w-xl p-7 sm:p-10">
        <p className="eyebrow">账号升级</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold">设置用户名和新密码</h1>
        <p className="mt-4 text-sm leading-7 text-muted">设置后不再需要邮箱。你的用户编号、知识库、文档和聊天记录都会保持不变。</p>
        {error ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{errorMessages[error] ?? errorMessages.migration}</div> : null}
        <form action={setupUsernameForCurrentUser} className="mt-7 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">用户名</span>
            <input type="text" name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" className="form-field" placeholder="例如：skypulse_1" />
            <span className="mt-2 block text-xs text-muted">全局唯一，设置后暂不支持修改</span>
          </label>
          <PasswordField label="新密码" isNew />
          <PasswordField name="passwordConfirm" label="确认新密码" isNew />
          <SubmitButton label="保存并升级账号" pendingLabel="正在保存…" />
        </form>
      </section>
    </main>
  );
}
