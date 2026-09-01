import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { TrashManager, type TrashedSource } from "@/components/trash/trash-manager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data } = await supabase.from("documents").select("id, original_name, source_kind, deleted_at, purge_after").not("deleted_at", "is", null).gt("purge_after", new Date().toISOString()).order("deleted_at", { ascending: false });
  return <main className="app-page"><AppHeader /><div className="page-container"><TrashManager sources={(data ?? []) as TrashedSource[]} /></div></main>;
}
