import { redirect } from "next/navigation";

// Tracking moved into the unified "Technical" panel. Keep this path working
// for old links/bookmarks by redirecting to the Tracking tab there.
export default async function TrackingRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; template?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ doc: "tracking" });
  if (sp.tab) qs.set("tab", sp.tab);
  if (sp.template) qs.set("template", sp.template);
  redirect(`/admin/website/technical?${qs.toString()}`);
}
