"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { canonicalizeSourcePath } from "@/lib/website-builder/redirects";

const ALLOWED_STATUS = new Set([301, 302, 307, 308]);

function normalizeSourcePath(raw: string): string {
  if (!raw.trim()) throw new Error("Source path is required");
  return canonicalizeSourcePath(raw);
}

function normalizeTarget(raw: string): string {
  const t = raw.trim();
  if (!t) throw new Error("Target is required");
  // Allow absolute URLs or path-relative targets starting with "/"
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return t;
  throw new Error("Target must be a full URL or start with /");
}

export async function createRedirect(formData: FormData) {
  const source_path = normalizeSourcePath(String(formData.get("source_path") ?? ""));
  const target = normalizeTarget(String(formData.get("target") ?? ""));
  const status_code = Number(formData.get("status_code") ?? 301);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!ALLOWED_STATUS.has(status_code)) throw new Error("Invalid status code");
  if (source_path === target) throw new Error("Source and target must differ");

  const sb = supabaseServer();
  const { error } = await sb.from("redirects").insert({
    source_path,
    target,
    status_code,
    notes,
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error(`A redirect for "${source_path}" already exists`);
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin/website/redirects");
}

export async function updateRedirect(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  const source_path = normalizeSourcePath(String(formData.get("source_path") ?? ""));
  const target = normalizeTarget(String(formData.get("target") ?? ""));
  const status_code = Number(formData.get("status_code") ?? 301);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!ALLOWED_STATUS.has(status_code)) throw new Error("Invalid status code");
  if (source_path === target) throw new Error("Source and target must differ");

  const sb = supabaseServer();
  const { error } = await sb
    .from("redirects")
    .update({ source_path, target, status_code, notes })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      throw new Error(`A redirect for "${source_path}" already exists`);
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin/website/redirects");
}

export async function deleteRedirect(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  const sb = supabaseServer();
  const { error } = await sb.from("redirects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/website/redirects");
}
