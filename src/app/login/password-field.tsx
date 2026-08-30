"use client";

import { useState } from "react";

export function PasswordField({ isNew = false }: { isNew?: boolean }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">密码</span>
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          name="password"
          minLength={8}
          autoComplete={isNew ? "new-password" : "current-password"}
          required
          placeholder={isNew ? "至少 8 个字符" : "请输入密码"}
          className="form-field pr-16"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900"
          aria-label={visible ? "隐藏密码" : "显示密码"}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </span>
    </label>
  );
}
