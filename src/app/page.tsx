import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f4ed] text-stone-900">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-700/50 to-transparent" />
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 font-serif text-lg text-white">证</div>
          <div><p className="font-semibold tracking-[0.18em]">语证</p><p className="text-[11px] tracking-wide text-stone-500">TRACEABLE EVIDENCE</p></div>
        </div>
        <Link href="/login" className="secondary-button bg-white/70">登录 / 注册</Link>
      </nav>
      <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-16 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div>
          <p className="inline-flex rounded-full border border-amber-700/20 bg-amber-50 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-amber-800">可溯源学术证据智能体</p>
          <h1 className="mt-8 max-w-3xl font-serif text-5xl font-semibold leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl">在自己的资料里，<span className="text-amber-800">找到有出处的答案。</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">建立个人课程与研究资料空间。语证先检索、再核验证据、再形成回答，让每个观点都能回到文档与页码。</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="primary-button h-12 px-7">开始使用语证</Link>
            <a href="#principles" className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white/60 px-7 text-sm font-medium transition hover:bg-white">了解证据原则</a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-10 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_30px_100px_rgba(68,64,60,0.14)] sm:p-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-5">
              <div><p className="text-xs font-semibold tracking-[0.16em] text-stone-400">EVIDENCE NOTE</p><p className="mt-1 font-serif text-lg font-semibold">长征战略意义比较</p></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">已核验</span>
            </div>
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl bg-stone-50 p-5"><p className="text-xs font-medium text-stone-400">支持观点</p><p className="mt-2 leading-7 text-stone-700">两份材料都将战略转移视为保存革命力量的重要转折，但论证侧重点不同。</p></div>
              <blockquote className="border-l-2 border-amber-700 pl-4 text-sm leading-6 text-stone-500">“……实现了战略方针的重大转变……”</blockquote>
              <div className="flex items-center justify-between text-xs text-stone-500"><span>来源：A.pdf · 第 3 页</span><span className="font-medium text-amber-800">查看原文 →</span></div>
            </div>
          </div>
        </div>
      </section>
      <section id="principles" className="border-t border-stone-200 bg-white/50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3">
          {[["01", "限定知识范围", "只在你选择的知识库与文档范围内检索。"], ["02", "证据先于结论", "证据不足时明确说明，不强行补全答案。"], ["03", "回到文档原文", "证据卡保留来源文档、页码与关键原文。"]].map(([number, title, detail]) => (
            <div key={number} className="border-l border-stone-300 pl-5"><p className="text-xs font-semibold text-amber-700">{number}</p><h2 className="mt-3 font-serif text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-500">{detail}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}
