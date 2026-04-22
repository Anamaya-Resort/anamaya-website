import VideoHero from "@/components/VideoHero";

// Match v2: YouTube video on desktop (HD), mp4 fallback on mobile.
const HERO_YOUTUBE_ID = "9d5jqBsUpWI";
const HERO_MP4 =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2025/01/Anamaya-Phone-Header.mp4";

export default function Home() {
  return (
    <>
      <VideoHero
        youtubeId={HERO_YOUTUBE_ID}
        mp4Src={HERO_MP4}
        overlayOpacity={20}
      >
        <div>
          <h1 className="text-4xl font-semibold tracking-tight drop-shadow sm:text-6xl">
            Anamaya
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/90 drop-shadow sm:text-xl">
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
          Scroll up — the header flips from transparent (white logo) to solid
          white (dark logo). Body of the homepage coming next.
        </p>
      </section>
    </>
  );
}
