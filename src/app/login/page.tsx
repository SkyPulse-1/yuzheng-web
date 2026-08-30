import Link from "next/link";

import { signInWithUsername, signUpWithUsername } from "@/app/login/actions";
import { PasswordField } from "@/app/login/password-field";
import { SubmitButton } from "@/app/login/submit-button";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorMessages: Record<string, string> = {
  config: "登录服务尚未配置完成，请稍后再试。",
  username: "用户名需为 3–24 位英文、数字或下划线。",
  credentials: "用户名或密码错误。",
  password: "密码至少需要 8 个字符。",
  password_match: "两次输入的密码不一致。",
  username_taken: "这个用户名已经被使用，请换一个。",
  signup: "注册失败，请稍后重试。",
  confirmation: "注册服务设置尚未完成，请联系管理员。",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : "";
  const mode = params.mode === "signup" ? "signup" : "password";
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
                <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">{mode === "signup" ? "创建你的知识空间" : "登录你的知识空间"}</h2>
                <p className="mt-3 text-sm leading-6 text-stone-500">{mode === "signup" ? "不需要邮箱，注册后即可在多台设备使用同一个知识空间。" : "输入用户名和密码，继续整理你的研究资料。"}</p>
              </div>

              <div className="mt-8 grid grid-cols-2 rounded-xl bg-stone-100 p-1" aria-label="账号入口">
                <Link href="/login?mode=password" className={`rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${mode === "password" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>登录</Link>
                <Link href="/login?mode=signup" className={`rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${mode === "signup" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>注册</Link>
              </div>

              {errorCode ? (
                <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">{errorMessages[errorCode] ?? errorMessages.signup}</div>
              ) : null}

              <form action={mode === "signup" ? signUpWithUsername : signInWithUsername} className="mt-6 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">用户名</span>
                  <input type="text" name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" placeholder="例如：skypulse_1" className="form-field" />
                  {mode === "signup" ? <span className="mt-2 block text-xs text-stone-400">3–24 位英文、数字或下划线，不区分大小写</span> : null}
                </label>
                <PasswordField isNew={mode === "signup"} />
                {mode === "signup" ? <PasswordField name="passwordConfirm" label="确认密码" isNew /> : null}
                <SubmitButton label={mode === "signup" ? "创建账号" : "登录"} pendingLabel={mode === "signup" ? "正在创建…" : "正在登录…"} />
              </form>

              {mode === "password" ? <div className="mt-6 text-center text-sm"><Link href="/account/recovery" className="font-medium text-stone-600 hover:text-amber-800">忘记密码？使用恢复码</Link></div> : null}

              {!configured ? <p className="mt-5 text-xs leading-5 text-stone-500">当前为界面预览状态；连接 Supabase 项目后即可注册和登录。</p> : null}
              <p className="mt-10 border-t border-stone-200 pt-6 text-xs leading-5 text-stone-400">登录即表示你同意仅将语证用于合法的课程学习与研究材料管理。</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
