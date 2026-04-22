import Link from "next/link";

type Retreat = {
  title: string;
  dates: string;
  description: string;
  href: string;
  // image: string;  // TODO: wire up real featured image from Supabase Storage
};

const RETREATS: Retreat[] = [
  {
    title: "The Anatomy of Sacred Breath",
    dates: "May 16 – 23, 2026",
    description:
      "Awaken your breath, awaken your life. Join Cristiane Machado in Costa Rica for a transformational retreat that restores balance, energy, and inner peace. Each day blends yoga, sacred cacao ceremonies, breathwork workshops, and unforgettable excursions.",
    href: "/retreat/the-anatomy-of-sacred-breath-cristiane-machado/",
  },
  {
    title: "Root to Rise",
    dates: "May 30 – June 6, 2026",
    description:
      "Slow down, breathe deeply, and remember who you are beneath it all. Join Jacqueline Burbage at Anamaya Resort for a customizable wellness retreat blending somatic movement, mindfulness, and deep rest.",
    href: "/retreat/root-to-rise-costa-rica-yoga-retreat-jacqueline-burbage/",
  },
  {
    title: "InwardBound 7-Day Retreat Facilitation Training",
    dates: "August 22 – 29, 2026",
    description:
      "A 7-day immersive training bridging ancient wisdom with modern therapeutic practice. Designed for licensed professionals and experienced practitioners, you'll develop real facilitation skill through direct experience and a trauma-informed methodology rooted in the work of Dr. Stanislav Grof.",
    href: "/retreat/inwardbound-7-day-psychedelic-facilitation-immersive-skills-training/",
  },
  {
    title: "A Sensory Awakening Retreat",
    dates: "October 31 – November 7, 2026",
    description:
      "You've been running on empty. What if seven days could change that? Through the L.O.V.E. framework with Kim & Scott Goyette, you'll silence your inner critic, reconnect to your intuition, and step into the fullness of who you were always meant to be.",
    href: "/retreat/a-sensory-awakening-retreat-kim-scott-goyette/",
  },
  {
    title: "The Primal Return Special Retreat",
    dates: "December 12 – 19, 2026",
    description:
      "7 days in the Costa Rican jungle designed to break the burnout pattern. Morning movement, guided breathwork, sacred ceremony, waterfall treks, and nourishing farm-to-table meals, all held by world-class facilitator Sierra Kliscz.",
    href: "/retreat/primal-return-retreat-costa-rica-sierra-kliscz/",
  },
];

export default function FeaturedRetreats() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-anamaya-charcoal sm:text-4xl">
          Featured Retreats
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {RETREATS.map((r) => (
            <article
              key={r.title}
              className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-anamaya-charcoal/10 transition-shadow hover:shadow-xl"
            >
              {/* TODO: real featured image from Supabase Storage */}
              <div
                className="h-56 w-full bg-gradient-to-br from-anamaya-green to-anamaya-teal"
                aria-hidden="true"
              />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-semibold leading-snug text-anamaya-charcoal">
                  {r.title}
                </h3>
                <p className="mt-2 text-sm font-medium uppercase tracking-wider text-anamaya-olive">
                  {r.dates}
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-anamaya-charcoal/80">
                  {r.description}
                </p>
                <Link
                  href={r.href}
                  className="mt-6 inline-block self-start rounded-full bg-anamaya-green px-6 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
                >
                  Register Now
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
