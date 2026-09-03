import type { RetreatLeaderContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ResolvedLeader = {
  name: string;
  photo_url: string | null;
  bio_html: string | null;
};

/**
 * Live lookup of a teacher's profile from AnamayOS (persons +
 * retreat_leader_profiles). Silent on failure — the caller falls back to
 * the block's manual fields, same pattern as DetailsRatesDynamicBlock.
 */
async function resolveLeader(id: string | undefined): Promise<ResolvedLeader | null> {
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
    .select("short_bio, public_bio, photo_url")
    .eq("person_id", trimmed)
    .maybeSingle();

  return {
    name: person.full_name ?? "",
    photo_url: profile?.photo_url ?? person.avatar_url ?? null,
    bio_html: profile?.public_bio ?? profile?.short_bio ?? null,
  };
}

/**
 * Retreat Leader — vertical block for a retreat template's side column.
 * One instance per teacher. Prefers live AnamayOS data (`ao_person_id`);
 * falls back to the manual name/photo/bio fields set on the block.
 */
export default async function RetreatLeaderBlock({
  content,
  preview,
}: {
  content: RetreatLeaderContent;
  /** Admin block-preview only: when the block has no real leader attached,
   *  render a sample profile card so the design shows. Never set publicly. */
  preview?: boolean;
}) {
  const c = content ?? {};

  // Admin preview with no leader configured: a same-origin sample card so the
  // block has visible height (skips the live AO lookup entirely).
  if (preview && !c.ao_person_id && !c.name && !c.bio_html && !c.photo_url) {
    return (
      <aside className="mx-auto w-full max-w-[360px]">
        <div className="overflow-hidden rounded-lg border border-anamaya-mint/50 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/yoga_retreat_costarica.webp"
            alt="Maya Sol"
            className="aspect-square w-full object-cover"
          />
          <div className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-anamaya-green">
              Lead Facilitator
            </div>
            <h3 className="mt-1 font-heading text-xl font-semibold leading-tight text-anamaya-charcoal">
              Maya Sol
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-anamaya-charcoal">
              Maya has guided ocean-side yoga and breathwork retreats in
              Montezuma for over a decade, weaving gentle movement with deep
              rest.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const live = await resolveLeader(c.ao_person_id);
  const name = live?.name || c.name || "";
  const photo = live?.photo_url || c.photo_url || null;
  const bio = live?.bio_html || c.bio_html || null;

  if (!name && !bio) return null;

  const bg = resolveBrandColor(c.bg_color) ?? "#ffffff";
  const text = resolveBrandColor(c.text_color) ?? undefined;

  return (
    <aside className="mx-auto w-full max-w-[360px]" style={{ color: text }}>
      <div
        className="overflow-hidden rounded-lg border border-anamaya-mint/50 shadow-sm"
        style={{ backgroundColor: bg }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={name} className="aspect-square w-full object-cover" />
        )}
        <div className="p-5">
          {c.role && (
            <div className="text-xs font-semibold uppercase tracking-wider text-anamaya-green">
              {c.role}
            </div>
          )}
          {name && (
            <h3 className="mt-1 font-heading text-xl font-semibold leading-tight text-anamaya-charcoal">
              {c.link_href ? (
                <a href={c.link_href} className="hover:text-anamaya-green">
                  {name}
                </a>
              ) : (
                name
              )}
            </h3>
          )}
          {bio && (
            <div
              className="prose-anamaya prose-anamaya-block mt-3 text-sm leading-relaxed [&_p]:mb-2 line-clamp-[12]"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: bio }}
            />
          )}
          {c.link_label && c.link_href && (
            <a
              href={c.link_href}
              className="mt-4 inline-block text-sm font-semibold text-anamaya-green underline underline-offset-2 hover:text-anamaya-green-dark"
            >
              {c.link_label}
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
