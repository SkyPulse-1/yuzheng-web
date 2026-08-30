import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { LibraryManager } from "@/components/libraries/library-manager";
import type { Library } from "@/lib/libraries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LibrariesPage({ searchParams }: { searchParams: Promise<{ create?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/libraries");

  const [{ data, error }, { data: documentRows }] = await Promise.all([
    supabase.from("libraries").select("id, owner_id, name, description, created_at, updated_at").order("updated_at", { ascending: false }),
    supabase.from("documents").select("library_id"),
  ]);
  const documentCounts = (documentRows ?? []).reduce<Record<string, number>>((counts, row) => {
    counts[row.library_id] = (counts[row.library_id] ?? 0) + 1;
    return counts;
  }, {});
  const query = await searchParams;

  return (
    <main className="app-page">
      <AppHeader />
      <div className="page-container">
        {error ? <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">知识库暂时无法加载，请刷新重试。</p> : null}
        <LibraryManager libraries={(data ?? []) as Library[]} documentCounts={documentCounts} startCreating={query.create === "1"} />
      </div>
    </main>
  );
}
