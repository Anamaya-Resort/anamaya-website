import type { TeacherProfileContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ResolvedTeacher = {
  name: string;
  photo_url: string | null;
  bio_html: string | null;
  credentials: string | null;
};

/** Live lookup from AnamayOS (persons + retreat_leader_profiles). Silent on
 *  failure — the caller falls back to the manual fields on the block. */
async function resolveTeacher(id: string | undefined): Promise<ResolvedTeacher | null> {
  const trimmed = id?.trim();
  if (!trimmed || !UUID_RE.test(trimmed)) return null;
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return null;

  const { data: person, error } = await ao
    .from("persons")
    .select("full_name, avatar_url")
    .eq("id", trimmed)
    .maybeSingle();
  if (error || !person) return null;

  const { data: profile } = await ao
    .from("retreat_leader_profiles")
    .select("short_bio, public_bio, photo_url, teaching_style, years_experience")
    .eq("person_id", trimmed)
    .maybeSingle();

  const credentials =
    profile?.teaching_style ||
    (profile?.years_experience ? `${profile.years_experience}+ years teaching` : null);

  return {
    name: person.full_name ?? "",
    photo_url: profile?.photo_url ?? person.avatar_url ?? null,
    bio_html: profile?.public_bio ?? profile?.short_bio ?? null,
    credentials: credentials ?? null,
  };
}

/**
 * Teacher Profile — the main block of the single-retreat_leader template.
 * One shared instance across all leader pages; each page's real content
 * comes from a per-page override (see the type doc). Renders nothing
 * (rather than a broken empty page) when there's neither a live nor a
 * manual name to show.
 *
 * Layout: a soft header band (circular portrait, name, credentials,
 * specialty pills) over the bio in a readable centered column, closing
 * with a row of "Connect" pill links. The circular portrait is a
 * deliberate one-off shape for a person's photo — every other card-style
 * block on the site uses rounded-lg.
 */
export default async function TeacherProfileBlock({ content }: { content: TeacherProfileContent }) {
  const c = content ?? {};
  const live = await resolveTeacher(c.ao_person_id);
  const name = live?.name || c.name || "";
  const photo = live?.photo_url || c.photo_url || null;
  const bio = live?.bio_html || c.bio_html || null;
  const credentials = live?.credentials || c.credentials || null;

  if (!name) return null;

  const bg = resolveBrandColor(c.bg_color) ?? "#ffffff";
  const text = resolveBrandColor(c.text_color) ?? undefined;
  const specialties = Array.isArray(c.specialties) ? c.specialties.filter(Boolean) : [];
  const hasLinks = Boolean(c.website_url || c.instagram_handle);

  return (
    <article style={{ backgroundColor: bg, color: text }}>
      <header className="bg-anamaya-cream px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={name}
              className="mx-auto aspect-square w-40 rounded-full object-cover shadow-md ring-4 ring-white sm:w-48"
            />
          )}
          <h1 className="mt-6 font-heading text-4xl font-semibold leading-tight text-anamaya-charcoal sm:text-5xl">
            {name}
          </h1>
          {credentials && (
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.15em] text-anamaya-green">
              {credentials}
            </p>
          )}
          {specialties.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {specialties.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full border border-anamaya-mint bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {(bio || hasLinks) && (
        <div className="px-6 py-16">
          {bio && (
            <div
              className="prose-anamaya prose-anamaya-block mx-auto max-w-2xl text-[1.05rem] leading-relaxed"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: bio }}
            />
          )}
          {hasLinks && (
            <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-4">
              {c.website_url && (
                <a
                  href={c.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-anamaya-green px-5 py-2 text-sm font-semibold uppercase tracking-wider text-anamaya-green transition-colors hover:bg-anamaya-green hover:text-white"
                >
                  Website
                </a>
              )}
              {c.instagram_handle && (
                <a
                  href={`https://instagram.com/${c.instagram_handle.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-anamaya-green px-5 py-2 text-sm font-semibold uppercase tracking-wider text-anamaya-green transition-colors hover:bg-anamaya-green hover:text-white"
                >
                  @{c.instagram_handle.replace(/^@/, "")}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
