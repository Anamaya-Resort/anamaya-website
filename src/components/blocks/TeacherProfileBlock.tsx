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
 * Teacher Profile — the main block of the single-yoga_teacher template.
 * One shared instance across all teacher pages; each page's real content
 * comes from a per-page override (see the type doc). Renders nothing
 * (rather than a broken empty page) when there's neither a live nor a
 * manual name to show.
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

  return (
    <section className="w-full px-6 py-16" style={{ backgroundColor: bg, color: text }}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center sm:flex-row sm:items-start sm:text-left">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={name}
            className="aspect-square w-48 shrink-0 rounded-lg object-cover shadow-sm"
          />
        )}
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-semibold text-anamaya-charcoal">{name}</h1>
          {credentials && (
            <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-anamaya-green">
              {credentials}
            </p>
          )}
          {specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {specialties.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full bg-anamaya-mint/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {bio && (
            <div
              className="prose-anamaya prose-anamaya-block mt-5"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: bio }}
            />
          )}
          {(c.website_url || c.instagram_handle) && (
            <div className="mt-5 flex flex-wrap justify-center gap-4 sm:justify-start">
              {c.website_url && (
                <a
                  href={c.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-anamaya-green underline underline-offset-2 hover:text-anamaya-green-dark"
                >
                  Website
                </a>
              )}
              {c.instagram_handle && (
                <a
                  href={`https://instagram.com/${c.instagram_handle.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-anamaya-green underline underline-offset-2 hover:text-anamaya-green-dark"
                >
                  @{c.instagram_handle.replace(/^@/, "")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
