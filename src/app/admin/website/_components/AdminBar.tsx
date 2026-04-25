import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import UserAvatar from "@/components/UserAvatar";
import DarkSignOut from "./DarkSignOut";

/** Slim WP-style top admin bar (32px tall). Persists across all
 *  /admin/website routes — gives users a way back to the main admin and a
 *  one-click "View site" link. */
export default async function AdminBar() {
  const user = await getSessionUser();

  return (
    <header className="flex h-8 items-center justify-between bg-[#1d2327] px-3 text-[13px] text-zinc-200">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="font-semibold tracking-tight text-white hover:text-zinc-300"
        >
          Anamaya Admin
        </Link>
        <span className="text-zinc-500">/</span>
        <Link
          href="/admin/website"
          className="text-zinc-300 hover:text-white"
        >
          Website Builder
        </Link>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-zinc-300 hover:text-white"
        >
          <ExternalLink className="h-3 w-3" />
          View Site
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <DarkSignOut />
        {user && (
          <div className="flex items-center gap-2">
            <span className="hidden text-zinc-300 sm:inline">
              {user.display_name || user.username || user.email}
            </span>
            <UserAvatar user={user} ringColor="#1d2327" />
          </div>
        )}
      </div>
    </header>
  );
}
