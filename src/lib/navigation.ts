export type NavigationSection = "dashboard" | "libraries" | "trash";

export function getNavigationSection(pathname: string): NavigationSection | null {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/libraries" || pathname.startsWith("/libraries/") || pathname === "/assistant") return "libraries";
  if (pathname === "/trash") return "trash";
  return null;
}
