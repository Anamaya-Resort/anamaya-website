import Link from "next/link";

const CARDS = [
  {
    title: "Wellness Options",
    href: "/spa-massage-costa-rica/",
    body: "Advanced wellness therapies and holistic spa treatments for both curious and seasoned biohackers. Bodywork, natural skincare, beauty services, and holistic health modalities that foster physical, emotional, and energetic healing. Red-light and oxygen therapies, FSM, Rife and scalar treatments, infrared sauna, cold-plunge sessions, and more.",
  },
  {
    title: "Yoga Retreats",
    href: "/retreats/",
    body: "Join us for a transformational and fully customizable Yoga Retreat in Costa Rica. Our week-long retreats are designed to help you destress, reset your nervous system, and recharge. Each retreat is customizable — whether you're seeking adventure, deep relaxation, or spiritual growth, you can tailor your experience to match your needs.",
  },
  {
    title: "Yoga Teacher Trainings",
    href: "/rates-yoga-teacher-training/",
    body: "Our immersive 200-Hour Yoga Teacher Trainings in Costa Rica are led by expert, internationally recognized instructors. We've supported thousands of graduates in earning their Yoga Alliance Certification while experiencing transformational growth in a breathtaking environment. Small group sizes, personalized attention, and a supportive community.",
  },
];

export default function CustomizeCards() {
  return (
    <section className="bg-anamaya-cream px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-anamaya-charcoal sm:text-4xl">
          Customize Your Anamaya Experience
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <article
              key={c.title}
              className="group flex flex-col rounded-lg bg-white p-8 shadow-md ring-1 ring-anamaya-charcoal/10 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <h3 className="font-heading text-2xl font-semibold uppercase tracking-wider text-anamaya-olive">
                {c.title}
              </h3>
              <div className="mt-4 h-0.5 w-12 bg-anamaya-green" />
              <p className="mt-6 flex-1 text-sm leading-relaxed text-anamaya-charcoal/80">
                {c.body}
              </p>
              <Link
                href={c.href}
                className="mt-6 inline-block self-start text-sm font-semibold uppercase tracking-wider text-anamaya-green transition-colors hover:text-anamaya-green-dark"
              >
                Learn More →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
