import Link from "next/link";

import { recoverAccount } from "@/app/account/recovery/actions";
import { PasswordField } from "@/app/login/password-field";
import { SubmitButton } from "@/app/login/submit-button";

const errorMessages: Record<string, string> = {
  config: "账号恢复服务尚未配置完成，请稍后再试。",
  locked: "尝试次数过多，请 15 分钟后再试。",
  password: "新密码至少需要 8 个字符。",
  password_match: "两次输入的新密码不一致。",
  recovery: "用户名或恢复码错误。",
  reset: "密码修改失败，请稍后再试。",
};

export default async function AccountRecoveryPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error = "" } = await searchParams;

  return (
    <main className="min-h-screen px-5 py-10 text-ink">
      <section className="reading-room-section mx-auto mt-4 max-w-xl p-7 sm:p-10">
        <Link href="/login" className="text-sm text-muted hover:text-primary">← 返回登录</Link>
        <p className="eyebrow mt-10">账号恢复</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold">使用恢复码设置新密码</h1>
        <p className="mt-4 text-sm leading-7 text-muted">成功修改密码后，旧恢复码会失效，系统将生成一条新的恢复码。</p>

        {error ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{errorMessages[error] ?? errorMessages.recovery}</div> : null}

        <form action={recoverAccount} className="mt-7 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">用户名</span>
            <input type="text" name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" className="form-field" placeholder="你的用户名" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">恢复码</span>
            <input type="text" name="recoveryCode" autoComplete="off" required className="form-field font-mono uppercase tracking-wide" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" />
          </label>
          <PasswordField label="新密码" isNew />
          <PasswordField name="passwordConfirm" label="确认新密码" isNew />
          <SubmitButton label="设置新密码" pendingLabel="正在验证…" />
        </form>
      </section>
    </main>
  );
}
