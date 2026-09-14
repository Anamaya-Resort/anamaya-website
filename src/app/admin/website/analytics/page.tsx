import Link from "next/link";
import PageHeader from "../_components/PageHeader";

/**
 * Analytics home. First-party split-test numbers live on the Split Testing
 * panel today; the Google Analytics (GA4) traffic dashboard lands here once
 * the GA4 service-account connection is configured.
 */
export default function AnalyticsPage() {
  return (
    <div className="px-5 py-4">
      <PageHeader title="Analytics" />

      <div className="space-y-4">
        <div className="rounded-2xl border border-[#c3c4c7] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[#1d2327]">
            Google Analytics — not connected yet
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] text-[#50575e]">
            Once a GA4 service account is granted read access and its Property
            ID is set, this page will show traffic by source (Google, Meta,
            direct, referrals), device, geography, and landing pages, pulled
            live from the GA4 Data API. Whole-visit metrics like time-on-site
            will come from here too.
          </p>
        </div>

        <div className="rounded-2xl border border-[#c3c4c7] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[#1d2327]">
            First-party performance (live now)
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] text-[#50575e]">
            Per-version impressions, CTA click-through, and time-on-page for
            running split tests are tracked in our own database and shown on the
            Split Testing panel.
          </p>
          <Link
            href="/admin/website/split-testing"
            className="mt-3 inline-block rounded-full bg-[#2271b1] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#135e96]"
          >
            Open Split Testing
          </Link>
        </div>
      </div>
    </div>
  );
}
