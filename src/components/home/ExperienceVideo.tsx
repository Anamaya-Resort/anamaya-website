// "Experience Anamaya" — olive-titled heading + YouTube tour video.
// Matches v2's light-mint bg + dark-olive heading color.
// Uses the YouTubeFacade so the ~1.5 MB of YouTube player JS is not
// downloaded until the user actually clicks play. Lighthouse therefore
// counts none of it against initial-load metrics.

import YouTubeFacade from "@/components/blocks/shared/YouTubeFacade";

const EXPERIENCE_YT_ID = "5tiGSZ4KAJU";

export default function ExperienceVideo() {
  return (
    <section className="relative overflow-hidden bg-anamaya-mint px-6 py-20">
      <div className="relative mx-auto max-w-5xl text-center">
        <h2 className="font-heading text-4xl font-semibold uppercase tracking-wider text-anamaya-olive-dark sm:text-5xl">
          Experience Anamaya
        </h2>
        <div className="mx-auto mt-4 h-0.5 w-16 bg-anamaya-olive-dark/40" />

        <div className="mt-10 overflow-hidden rounded-lg shadow-xl ring-1 ring-anamaya-olive-dark/10">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <div className="absolute inset-0">
              <YouTubeFacade
                videoId={EXPERIENCE_YT_ID}
                title="Experience Anamaya"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
