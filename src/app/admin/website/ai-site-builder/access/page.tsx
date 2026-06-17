import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listAccessUsers } from "@/lib/ai-site-builder/access";
import PageHeader from "../../_components/PageHeader";
import PublishToggle from "./PublishToggle";

export const metadata = { title: "AI Site Builder — Access" };

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Superadmin-only: who can use the AI Site Builder + who may publish without approval. */
export default async function AiSiteBuilderAccessPage() {
  const me = await getSessionUser();
  if (me?.role !== "superadmin") {
    redirect("/admin/website/ai-site-builder");
  }

  const users = await listAccessUsers();

  return (
    <div className="px-5 py-4">
      <Link
        href="/admin/website/ai-site-builder"
        className="mb-5 inline-flex items-center gap-1.5 rounded-sm border border-[#2271b1] bg-white px-3.5 py-2 text-[15px] font-medium text-[#2271b1] hover:bg-[#f6fbfd] hover:text-[#135e96]"
      >
        ← Back to AI Site Builder
      </Link>
      <PageHeader title="AI Site Builder — Access" />

      <p className="mb-4 max-w-3xl text-[13px] leading-relaxed text-[#50575e]">
        Everyone who has opened the AI Site Builder appears here. By default,
        their changes are handed to you for review before going live. Tick{" "}
        <strong>Publish without approval</strong> to let a trusted person take
        their own changes live without waiting on you. You can untick it anytime.
      </p>

      <div className="max-w-3xl overflow-hidden rounded-sm border border-[#c3c4c7] bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#c3c4c7] bg-[#f6f7f7] text-left">
              <th className="px-3 py-2 font-semibold text-[#2271b1]">User</th>
              <th className="px-3 py-2 font-semibold text-[#2271b1]">Role</th>
              <th className="px-3 py-2 font-semibold text-[#2271b1]">Last used</th>
              <th className="w-44 px-3 py-2 font-semibold text-[#2271b1]">
                Publish without approval
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-12 text-center text-[#50575e]">
                  No one has opened the AI Site Builder yet. Users appear here the
                  first time they use it.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.sso_user_id} className="border-t border-[#f0f0f1] hover:bg-[#f6f7f7]">
                  <td className="px-3 py-2">
                    <div className="font-medium text-[#1d2327]">
                      {u.display_name || u.email || u.sso_user_id}
                    </div>
                    {u.email && u.display_name && (
                      <div className="text-[12px] text-[#50575e]">{u.email}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#50575e]">{u.role ?? "—"}</td>
                  <td className="px-3 py-2 text-[#50575e]">{fmt(u.last_seen)}</td>
                  <td className="px-3 py-2">
                    {u.role === "superadmin" ? (
                      <span className="text-[12px] text-[#50575e]">Always (owner)</span>
                    ) : (
                      <PublishToggle ssoUserId={u.sso_user_id} canPublish={u.can_publish} />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
