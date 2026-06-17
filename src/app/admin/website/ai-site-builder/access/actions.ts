"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { setCanPublish } from "@/lib/ai-site-builder/access";

/** Toggle a user's publish-without-approval override. Superadmin only. */
export async function toggleCanPublish(formData: FormData) {
  const me = await getSessionUser();
  if (me?.role !== "superadmin") {
    throw new Error("Only a Superadmin can change publish rights.");
  }
  const ssoUserId = String(formData.get("sso_user_id") ?? "");
  const value = String(formData.get("value")) === "true";
  if (!ssoUserId) return;
  await setCanPublish(ssoUserId, value);
  revalidatePath("/admin/website/ai-site-builder/access");
}
