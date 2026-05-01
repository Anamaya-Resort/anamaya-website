"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Pin,
  Mountain,
  Bed,
  User,
  Users,
  GraduationCap,
  ChefHat,
  Newspaper,
  Quote,
  Home,
  Image as ImageIcon,
  ArrowRightLeft,
  Settings,
} from "lucide-react";
import { POST_TYPES } from "@/lib/website-builder/post-types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Pin,
  Mountain,
  Bed,
  User,
  Users,
  GraduationCap,
  ChefHat,
  Newspaper,
  Quote,
  Home,
};

const TAXONOMY_LABELS: Record<string, string> = {
  category: "Categories",
  post_tag: "Tags",
  event_category: "Retreat Categories",
};

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
};

export default function Sidebar() {
  const pathname = usePathname();

  const items: Item[] = [
    { label: "Dashboard", href: "/admin/website", icon: LayoutDashboard },
    ...POST_TYPES.map<Item>((pt) => ({
      label: pt.pluralLabel,
      href: `/admin/website/${pt.slug}`,
      icon: ICON_MAP[pt.icon] ?? FileText,
      children: [
        { label: `All ${pt.pluralLabel}`, href: `/admin/website/${pt.slug}` },
        { label: "Add New", href: `/admin/website/${pt.slug}/new` },
        ...pt.taxonomies.map((tax) => ({
          label: TAXONOMY_LABELS[tax] ?? tax,
          href: `/admin/website/taxonomies/${tax}`,
        })),
      ],
    })),
    { label: "Media", href: "/admin/website/media", icon: ImageIcon },
    { label: "Authors", href: "/admin/website/authors", icon: Users },
    {
      label: "Redirects",
      href: "/admin/website/redirects",
      icon: ArrowRightLeft,
    },
    { label: "Settings", href: "/admin/website/settings", icon: Settings },
  ];

  function isActive(href: string, hasChildren: boolean): boolean {
    if (pathname === href) return true;
    if (hasChildren && pathname.startsWith(href + "/")) return true;
    return false;
  }

  return (
    <aside className="w-[200px] shrink-0 bg-[#1d2327] text-zinc-200 select-none">
      <nav className="py-1">
        {items.map((item) => {
          const active = isActive(item.href, !!item.children);
          const Icon = item.icon;
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-[9px] text-[13px] leading-tight transition-colors ${
                  active
                    ? "bg-[#2271b1] text-white font-medium"
                    : "text-zinc-300 hover:bg-[#2c3338] hover:text-white"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
              {active && item.children && (
                <div className="bg-[#2c3338] py-1">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block py-1.5 pl-[42px] pr-3 text-[13px] leading-tight ${
                          childActive
                            ? "text-white font-medium"
                            : "text-zinc-300 hover:text-white"
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
