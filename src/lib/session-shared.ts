// Pure, edge-safe helpers that don't import next/headers or server-only.
import type { SSOUser } from "@/types/sso";

export function isAdminRole(role: SSOUser["role"] | undefined): boolean {
  return role === "admin" || role === "superadmin";
}
