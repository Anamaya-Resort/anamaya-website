import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import type { SSOUser } from "@/types/sso";

/**
 * Who can use the AI Site Builder, and who may publish without owner approval.
 * Backed by the `ai_builder_access` table (migration 0051). All best-effort:
 * if the table doesn't exist yet or the service key is absent, these no-op
 * rather than throw, so the tool keeps working.
 */

export type AccessUser = {
  sso_user_id: string;
  email: string | null;
  display_name: string | null;
  role: string | null;
  can_publish: boolean;
  first_seen: string;
  last_seen: string;
};

const TABLE = "ai_builder_access";

/** Upsert the current admin so they show up in the access list. */
export async function recordVisit(user: SSOUser): Promise<void> {
  const db = supabaseServerOrNull();
  if (!db) return;
  // Deliberately omits can_publish so an existing override is never reset.
  await db
    .from(TABLE)
    .upsert(
      {
        sso_user_id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "sso_user_id" },
    )
    .then(undefined, () => {});
}

export async function listAccessUsers(): Promise<AccessUser[]> {
  const db = supabaseServerOrNull();
  if (!db) return [];
  const { data } = await db
    .from(TABLE)
    .select("*")
    .order("last_seen", { ascending: false });
  return (data as AccessUser[] | null) ?? [];
}

export async function setCanPublish(ssoUserId: string, value: boolean): Promise<void> {
  const db = supabaseServerOrNull();
  if (!db) return;
  await db.from(TABLE).update({ can_publish: value }).eq("sso_user_id", ssoUserId);
}

/** Used later by the runtime to decide: auto-publish vs hand off for review. */
export async function canUserPublish(ssoUserId: string): Promise<boolean> {
  const db = supabaseServerOrNull();
  if (!db) return false;
  const { data } = await db
    .from(TABLE)
    .select("can_publish")
    .eq("sso_user_id", ssoUserId)
    .maybeSingle();
  return Boolean((data as { can_publish?: boolean } | null)?.can_publish);
}
