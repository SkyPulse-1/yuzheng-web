"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getNavigationSection, type NavigationSection } from "@/lib/navigation";

const ITEMS: { href: string; label: string; section: NavigationSection }[] = [
  { href: "/dashboard", label: "工作台", section: "dashboard" },
  { href: "/libraries", label: "知识库", section: "libraries" },
];

export function AppNavigation() {
  const activeSection = getNavigationSection(usePathname());

  return (
    <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
      {ITEMS.map((item) => {
        const active = item.section === activeSection;
        return (
          <Link
            key={item.section}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:bg-white hover:text-stone-900"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
