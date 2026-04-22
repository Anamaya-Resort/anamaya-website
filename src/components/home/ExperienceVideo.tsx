// "Experience Anamaya" — olive-titled heading + YouTube tour video.
// Matches v2's light-mint bg + dark-olive heading color.
// The iframe is deferred via IntersectionObserver so the ~700 KB of YouTube
// player JS doesn't load until the user scrolls near the section.

import DeferUntilVisible from "@/components/DeferUntilVisible";

const EXPERIENCE_YT_ID = "5tiGSZ4KAJU";

export default function ExperienceVideo() {
  return (
    <section className="relative overflow-hidden bg-anamaya-mint px-6 py-20">
      <div className="relative mx-auto max-w-5xl text-center">
        <h2 className="text-3xl font-semibold uppercase tracking-wider text-anamaya-olive-dark sm:text-4xl">
          Experience Anamaya
        </h2>
        <div className="mx-auto mt-4 h-0.5 w-16 bg-anamaya-olive-dark/40" />

        <div className="mt-10 overflow-hidden rounded-lg shadow-xl ring-1 ring-anamaya-olive-dark/10">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <DeferUntilVisible
              className="absolute inset-0"
              rootMargin="400px"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-anamaya-olive-dark/5 text-sm text-anamaya-olive-dark/60">
                  Video loads when scrolled into view…
                </div>
              }
            >
              <iframe
                title="Experience Anamaya"
                src={`https://www.youtube.com/embed/${EXPERIENCE_YT_ID}?rel=0&modestbranding=1`}
                className="h-full w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </DeferUntilVisible>
          </div>
        </div>
      </div>
    </section>
  );
}
