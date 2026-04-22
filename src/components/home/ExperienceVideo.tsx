// "Experience Anamaya" — olive-titled heading + YouTube tour video.
// Replicates v2's section with the light-mint bg + dark-olive heading color.

const EXPERIENCE_YT_ID = "5tiGSZ4KAJU";

export default function ExperienceVideo() {
  return (
    <section className="relative overflow-hidden bg-anamaya-mint px-6 py-20">
      {/* Subtle background swirl, matching v2's SVG overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2020/11/swirls-background.svg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl text-center">
        <h2 className="text-3xl font-semibold uppercase tracking-wider text-anamaya-olive-dark sm:text-4xl">
          Experience Anamaya
        </h2>
        <div className="mx-auto mt-4 h-0.5 w-16 bg-anamaya-olive-dark/40" />

        <div className="mt-10 overflow-hidden rounded-lg shadow-xl ring-1 ring-anamaya-olive-dark/10">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              title="Experience Anamaya"
              src={`https://www.youtube.com/embed/${EXPERIENCE_YT_ID}?rel=0&modestbranding=1`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}
