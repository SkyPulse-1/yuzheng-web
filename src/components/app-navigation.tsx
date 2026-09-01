"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getNavigationSection, type NavigationSection } from "@/lib/navigation";

const ITEMS: { href: string; label: string; section: NavigationSection }[] = [
  { href: "/dashboard", label: "工作台", section: "dashboard" },
  { href: "/libraries", label: "知识库", section: "libraries" },
  { href: "/trash", label: "回收站", section: "trash" },
];

export function AppNavigation() {
  const activeSection = getNavigationSection(usePathname());

  return (
    <div className="flex items-center gap-1 rounded-xl border border-outline/80 bg-surface-muted/70 p-1">
      {ITEMS.map((item) => {
        const active = item.section === activeSection;
        return (
          <Link
            key={item.section}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-primary text-white shadow-[0_5px_14px_rgba(32,43,91,0.18)]" : "text-muted hover:bg-surface hover:text-primary"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
