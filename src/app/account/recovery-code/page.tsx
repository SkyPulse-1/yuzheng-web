import { redirect } from "next/navigation";

import { acknowledgeRecoveryCode } from "@/app/account/recovery-code/actions";
import { RecoveryCodeCard } from "@/app/account/recovery-code/recovery-code-card";
import { readRecoveryDeliveryCookie } from "@/lib/auth/recovery-delivery";

export default async function RecoveryCodePage() {
  const code = await readRecoveryDeliveryCookie();
  if (!code) redirect("/login");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_transparent_42%),linear-gradient(180deg,_#faf9f6,_#f0ede6)] px-5 py-10 text-stone-900">
      <section className="mx-auto mt-8 max-w-xl rounded-3xl border border-stone-200 bg-white p-7 shadow-xl sm:p-10">
        <p className="eyebrow">账号已创建</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold">保存你的恢复码</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">忘记密码时，这是找回账号的唯一凭证。系统不会通过邮箱或短信发送恢复链接。</p>
        <RecoveryCodeCard code={code} />
        <div className="mt-6 rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-600">
          建议保存到密码管理器或安全的离线位置。离开本页后，系统不会再次显示这条恢复码。
        </div>
        <form action={acknowledgeRecoveryCode} className="mt-7">
          <button className="primary-button w-full">我已保存，进入知识空间</button>
        </form>
      </section>
    </main>
  );
}
