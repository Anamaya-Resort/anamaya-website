// Reusable user avatar circle that handles:
//  - video avatars (mp4/webm/mov) — auto-plays muted and loops
//  - image avatars (png/jpg/webp) — static <img>
//  - no avatar → display initials on a neutral background
//  - pan/zoom transform on video frames (SSO sends avatar_pan_x/y + zoom)
//  - configurable outer ring color (defaults to white)

import type { SSOUser } from "@/types/sso";

type Props = {
  user: Pick<
    SSOUser,
    | "display_name"
    | "username"
    | "email"
    | "avatar_url"
    | "avatar_outer_color"
    | "avatar_inner_color"
    | "avatar_pan_x"
    | "avatar_pan_y"
    | "avatar_zoom"
  >;
  /** Tailwind sizing classes for the circle (default h-9 w-9). */
  size?: string;
  /** Override ring color. Defaults to white (for the header over dark hero). */
  ringColor?: string;
};

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)(\?|$)/i;

function isVideoUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return VIDEO_EXT_RE.test(path);
  } catch {
    return false;
  }
}

function initials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || name.slice(0, 1).toUpperCase();
}

export default function UserAvatar({ user, size = "h-9 w-9", ringColor = "white" }: Props) {
  const label = user.display_name || user.username || user.email;
  const url = user.avatar_url;
  const isVideo = url ? isVideoUrl(url) : false;

  const panX = user.avatar_pan_x ?? 0.5;
  const panY = user.avatar_pan_y ?? 0.5;
  const zoom = user.avatar_zoom ?? 1;

  // CSS object-position works for both <img> and <video> via CSS
  const objectPosition = `${Math.round(panX * 100)}% ${Math.round(panY * 100)}%`;
  const transform = zoom && zoom !== 1 ? `scale(${zoom})` : undefined;

  const ringStyle: React.CSSProperties = {
    boxShadow: `0 0 0 1px ${ringColor}`,
  };
  const innerBg = user.avatar_inner_color ?? "#e4e4e7"; // zinc-200 default

  return (
    <span
      className={`relative block overflow-hidden rounded-full ${size}`}
      style={{ ...ringStyle, backgroundColor: innerBg }}
      aria-label={label}
    >
      {url && isVideo && (
        <video
          src={url}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
          style={{ objectPosition, transform, transformOrigin: objectPosition }}
          aria-hidden="true"
        />
      )}
      {url && !isVideo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={label}
          className="h-full w-full object-cover"
          style={{ objectPosition, transform, transformOrigin: objectPosition }}
        />
      )}
      {!url && (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-700">
          {initials(label)}
        </span>
      )}
    </span>
  );
}
