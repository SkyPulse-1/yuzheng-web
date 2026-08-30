import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { LibraryManager } from "@/components/libraries/library-manager";
import type { Library } from "@/lib/libraries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LibrariesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/libraries");

  const { data, error } = await supabase
    .from("libraries")
    .select("id, owner_id, name, description, created_at, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        {error ? <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">知识库暂时无法加载，请刷新重试。</p> : null}
        <LibraryManager libraries={(data ?? []) as Library[]} />
      </div>
    </main>
  );
}
