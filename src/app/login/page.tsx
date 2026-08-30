import Link from "next/link";

import { requestMagicLink, signInWithPassword, signUpWithPassword } from "@/app/login/actions";
import { SubmitButton } from "@/app/login/submit-button";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorMessages: Record<string, string> = {
  auth: "登录链接无效或已经过期，请重新获取。",
  config: "Supabase 尚未连接，完成项目配置后即可发送登录邮件。",
  email: "请输入有效的邮箱地址。",
  send: "登录邮件发送失败，请稍后重试。",
  credentials: "邮箱或密码不正确。",
  password: "密码至少需要 8 个字符。",
  signup: "注册失败，该邮箱可能已经注册。",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : "";
  const sent = params.sent === "1";
  const registered = params.registered === "1";
  const mode = params.mode === "signup" ? "signup" : params.mode === "password" ? "password" : "magic";
  const configured = Boolean(getSupabasePublicEnv());

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f5f0e4,_transparent_38%),linear-gradient(180deg,_#faf9f6,_#f0ede6)] px-5 py-10 text-stone-900 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white/90 shadow-[0_24px_80px_rgba(41,37,36,0.10)] backdrop-blur lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden bg-stone-900 p-12 text-stone-100 lg:flex lg:flex-col lg:justify-between">
            <Link href="/" className="text-lg font-semibold tracking-[0.18em]">语证</Link>
            <div className="max-w-md space-y-5">
              <p className="text-xs font-semibold tracking-[0.24em] text-amber-300">TRACEABLE ACADEMIC EVIDENCE</p>
              <h1 className="font-serif text-4xl leading-tight">让每一个结论，<br />都能回到原文。</h1>
              <p className="leading-7 text-stone-300">建立个人课程与研究资料空间，在指定材料范围内获得可追溯回答。</p>
            </div>
            <p className="text-xs text-stone-500">语证 Web App · V1.0</p>
          </div>

          <div className="p-7 sm:p-12 lg:p-14">
            <div className="mx-auto max-w-md">
              <Link href="/" className="text-sm text-stone-500 hover:text-stone-900">← 返回首页</Link>
              <div className="mt-12">
                <p className="text-sm font-medium text-amber-700">欢迎使用语证</p>
                <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">登录你的知识空间</h2>
                <p className="mt-3 text-sm leading-6 text-stone-500">使用邮箱和密码登录，或注册一个新账号。</p>
              </div>

              {sent ? (
                <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">登录链接已发送，请前往邮箱查收。链接仅可使用一次。</div>
              ) : null}
              {registered ? (
                <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">账号已创建。若项目要求邮箱确认，请先完成确认，再返回这里登录。</div>
              ) : null}
              {errorCode ? (
                <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">{errorMessages[errorCode] ?? errorMessages.send}</div>
              ) : null}

              {mode === "magic" ? <form action={requestMagicLink} className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">邮箱地址</span>
                  <input type="email" name="email" autoComplete="email" required placeholder="name@example.com" className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-stone-700 focus:ring-4 focus:ring-stone-100" />
                </label>
                <SubmitButton />
              </form> : null}

              {mode === "password" || mode === "signup" ? <form action={mode === "signup" ? signUpWithPassword : signInWithPassword} className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">邮箱地址</span>
                  <input type="email" name="email" autoComplete="email" required placeholder="name@example.com" className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-stone-700 focus:ring-4 focus:ring-stone-100" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">密码</span>
                  <input type="password" name="password" minLength={mode === "signup" ? 8 : 6} autoComplete={mode === "signup" ? "new-password" : "current-password"} required placeholder={mode === "signup" ? "至少 8 个字符" : "请输入密码"} className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-stone-700 focus:ring-4 focus:ring-stone-100" />
                </label>
                <SubmitButton label={mode === "signup" ? "创建账号" : "登录"} pendingLabel={mode === "signup" ? "正在创建…" : "正在登录…"} />
              </form> : null}

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                {mode !== "password" ? <Link href="/login?mode=password" className="rounded-lg border border-stone-300 px-3 py-2 hover:border-stone-700">邮箱密码登录</Link> : null}
                {mode !== "signup" ? <Link href="/login?mode=signup" className="rounded-lg border border-stone-300 px-3 py-2 hover:border-stone-700">注册新账号</Link> : null}
                {mode !== "magic" ? <Link href="/login" className="rounded-lg border border-stone-300 px-3 py-2 hover:border-stone-700">使用邮件链接</Link> : null}
              </div>

              {!configured ? <p className="mt-5 text-xs leading-5 text-stone-500">当前为界面预览状态；连接 Supabase 项目后即可发送邮件。</p> : null}
              <p className="mt-10 border-t border-stone-200 pt-6 text-xs leading-5 text-stone-400">登录即表示你同意仅将语证用于合法的课程学习与研究材料管理。</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
