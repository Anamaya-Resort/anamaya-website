import VideoHero from "@/components/VideoHero";

const HERO_VIDEO =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2025/01/Anamaya-Phone-Header.mp4";

export default function Home() {
  return (
    <>
      <VideoHero videoSrc={HERO_VIDEO} overlayOpacity={25}>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Anamaya
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/90 sm:text-xl">
            Wellness retreats & yoga teacher trainings on a clifftop in
            Montezuma, Costa Rica.
          </p>
        </div>
      </VideoHero>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Placeholder content
        </h2>
        <p className="mt-4 text-zinc-600">
          Scroll up — the header should flip from transparent (white logo) to
          solid white (dark logo). Body of the homepage coming next.
        </p>
      </section>
    </>
  );
}
