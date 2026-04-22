import Link from "next/link";

export default function BookingSection() {
  return (
    <section className="bg-anamaya-cream px-6 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-anamaya-charcoal sm:text-4xl">
          New Simple Booking System
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-anamaya-charcoal/80">
          You can now register and secure your spot with a deposit directly on
          this site. Start on the calendar page. Choose by the teacher, theme,
          or simply the dates!
        </p>
        <Link
          href="/rg-calendar/"
          className="mt-8 inline-block rounded-full bg-anamaya-green px-10 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
        >
          View Full Calendar of Retreats
        </Link>
      </div>
    </section>
  );
}
