"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

export async function updateBlockContent(id: string, content: unknown) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("blocks")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blocks");
  revalidatePath(`/admin/blocks/${id}`);
  // Invalidate everything because blocks can live on many pages
  revalidatePath("/", "layout");
}

export async function renameBlock(id: string, name: string) {
  const sb = supabaseServer();
  const { error } = await sb.from("blocks").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blocks");
}
