import "server-only";

import { createAdminClient } from "./supabase/admin";

export async function purgeExpiredSources() {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: expired } = await admin
    .from("documents")
    .select("storage_path")
    .not("purge_after", "is", null)
    .lte("purge_after", now);
  const storagePaths = (expired ?? []).flatMap((row) => typeof row.storage_path === "string" && row.storage_path ? [row.storage_path] : []);
  if (storagePaths.length) await admin.storage.from("documents").remove(storagePaths);
  await admin.rpc("purge_expired_academic_sources");
}
