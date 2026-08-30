"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ label = "发送登录链接", pendingLabel = "正在发送…" }: { label?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-wait disabled:bg-stone-400"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
