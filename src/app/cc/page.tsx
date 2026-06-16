import CollabConsole from "./CollabConsole";
import { getSessionUser } from "@/lib/session";

export default async function CollaboratorConsolePage() {
  const user = await getSessionUser();
  const firstName = (user?.display_name || user?.username || "there").split(" ")[0];
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Hi {firstName} — let&apos;s work on the website.
        </h1>
        <p className="mt-2 max-w-2xl text-anamaya-charcoal/70">
          Describe what you&apos;d like to change or build. I&apos;ll work in your own
          private copy of the site (a branch) connected to the <strong>staging</strong>{" "}
          database — never the live site. When it looks right, the owner reviews it and
          decides when it goes live.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <GuideCard
          title="Edit content"
          body="Words, images, or which blocks are on a page are edited in the builder admin — I'll point you there."
        />
        <GuideCard
          title="Build or fix a block"
          body="Need a new kind of content block, a new template, or a fix to an existing one? That's code — I can do it here."
        />
        <GuideCard
          title="Always safe"
          body="I can't touch bookings, forms, the live database, or push anything live. Experiment freely."
        />
      </section>

      <section>
        <CollabConsole configured={configured} />
      </section>
    </div>
  );
}

function GuideCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-anamaya-brand-divider/30 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-anamaya-charcoal">{title}</div>
      <p className="mt-1 text-sm text-anamaya-charcoal/65">{body}</p>
    </div>
  );
}
