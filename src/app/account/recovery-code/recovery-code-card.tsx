"use client";

import { useState } from "react";

export function RecoveryCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-amber-800">RECOVERY CODE</p>
      <p className="mt-3 break-all font-mono text-lg font-semibold tracking-wider text-stone-900">{code}</p>
      <button type="button" onClick={copyCode} className="secondary-button mt-5 w-full border-amber-300 bg-white">
        {copied ? "已复制" : "复制恢复码"}
      </button>
    </div>
  );
}
