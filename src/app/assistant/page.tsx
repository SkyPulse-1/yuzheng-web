import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { AssistantWorkspace } from "@/components/assistant/assistant-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ libraryId?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { libraryId } = await searchParams;
  if (!libraryId) redirect("/libraries");
  const { data: library } = await supabase.from("libraries").select("id, name").eq("id", libraryId).maybeSingle();
  if (!library) notFound();
  const { data: documents } = await supabase.from("documents").select("id, original_name").eq("library_id", libraryId).eq("status", "READY").order("original_name");

  return <main className="app-page"><AppHeader /><AssistantWorkspace libraryId={library.id} libraryName={library.name} documents={documents ?? []} /></main>;
}
