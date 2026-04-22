"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="bg-anamaya-olive px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-semibold uppercase tracking-widest sm:text-3xl">
          Don&rsquo;t miss a thing...
        </h2>
        <p className="mt-4 text-base text-white/90">
          Want to receive our emails for special promotions, discounts, and
          first-time access?
        </p>
        {submitted ? (
          <p className="mt-8 text-lg">Thanks for signing up!</p>
        ) : (
          <form
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: wire to actual email list (Mailchimp/Mailgun — already on current site)
              setSubmitted(true);
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full max-w-sm rounded-full border-0 px-5 py-3 text-anamaya-charcoal placeholder-anamaya-charcoal/50 focus:outline-none focus:ring-2 focus:ring-white sm:flex-1"
            />
            <button
              type="submit"
              className="rounded-full bg-anamaya-charcoal px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-black"
            >
              Sign Up
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
