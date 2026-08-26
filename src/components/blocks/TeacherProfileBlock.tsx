import type { TeacherProfileContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ResolvedTeacher = {
  name: string;
  photo_url: string | null;
  banner_url: string | null;
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
    .select("short_bio, public_bio, photo_url, banner_image_url, teaching_style, years_experience")
    .eq("person_id", trimmed)
    .maybeSingle();

  const credentials =
    profile?.teaching_style ||
    (profile?.years_experience ? `${profile.years_experience}+ years teaching` : null);

  return {
    name: person.full_name ?? "",
    photo_url: profile?.photo_url ?? person.avatar_url ?? null,
    banner_url: profile?.banner_image_url ?? null,
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
 * Full-bleed photo hero (matching every other landing page on the site)
 * with the name overlaid, then a portrait card + bio laid out the same
 * way the retreat template pairs a leader card with body copy.
 */
export default async function TeacherProfileBlock({ content }: { content: TeacherProfileContent }) {
  const c = content ?? {};
  const live = await resolveTeacher(c.ao_person_id);
  const name = live?.name || c.name || "";
  const photo = live?.photo_url || c.photo_url || null;
  const banner = live?.banner_url || c.banner_url || photo;
  const bio = live?.bio_html || c.bio_html || null;
  const credentials = live?.credentials || c.credentials || null;

  if (!name) return null;

  const text = resolveBrandColor(c.text_color) ?? undefined;
  const specialties = Array.isArray(c.specialties) ? c.specialties.filter(Boolean) : [];
  const hasLinks = Boolean(c.website_url || c.instagram_handle);

  return (
    <article style={{ color: text }}>
      {banner && (
        <section className="relative flex h-[46vh] min-h-[320px] w-full items-end justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-anamaya-charcoal/80 via-anamaya-charcoal/20 to-transparent" />
          <div className="relative z-10 px-6 pb-10 text-center">
            <h1 className="font-heading text-4xl font-semibold uppercase tracking-wide text-white drop-shadow sm:text-6xl">
              {name}
            </h1>
            {credentials && (
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/90">
                {credentials}
              </p>
            )}
          </div>
        </section>
      )}

      <div className="bg-anamaya-brand-subtle px-6 py-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-12 sm:flex-row">
          <div className="mx-auto w-full max-w-xs shrink-0 sm:mx-0">
            {photo && (
              <div className="overflow-hidden rounded-lg border border-anamaya-mint/60 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={name} className="aspect-[4/5] w-full object-cover" />
              </div>
            )}
            {specialties.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                {specialties.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-anamaya-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-anamaya-green-dark"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {!banner && (
              <>
                <h1 className="font-heading text-4xl font-semibold text-anamaya-charcoal">{name}</h1>
                {credentials && (
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.15em] text-anamaya-green">
                    {credentials}
                  </p>
                )}
                <div className="mt-5 h-px w-16 bg-anamaya-mint" />
              </>
            )}
            {bio && (
              <div
                className="prose-anamaya prose-anamaya-block mt-2 max-w-2xl text-[1.05rem] leading-relaxed"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: bio }}
              />
            )}
            {hasLinks && (
              <div className="mt-8 flex flex-wrap gap-4">
                {c.website_url && (
                  <a
                    href={c.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-anamaya-green px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
                  >
                    Website
                  </a>
                )}
                {c.instagram_handle && (
                  <a
                    href={`https://instagram.com/${c.instagram_handle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-anamaya-green px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-anamaya-green transition-colors hover:bg-anamaya-green hover:text-white"
                  >
                    @{c.instagram_handle.replace(/^@/, "")}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
