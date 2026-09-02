"use client";

import type { MotionMode } from "../../lib/analysis-deck";

export function MotionModeToggle({ value, onChange }: { value: MotionMode; onChange: (value: MotionMode) => void }) {
  return (
    <div className="motion-mode-toggle" aria-label="卡片动效版本">
      <button type="button" aria-pressed={value === "native"} onClick={() => onChange("native")}>A 原生</button>
      <button type="button" aria-pressed={value === "motion"} onClick={() => onChange("motion")}>B Motion</button>
    </div>
  );
}
