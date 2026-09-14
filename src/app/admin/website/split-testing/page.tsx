import PageHeader from "../_components/PageHeader";
import { listSplitGroupsWithMembers } from "@/lib/website-builder/split-testing";
import SplitTestingPanel from "./SplitTestingPanel";

/**
 * Split Testing panel — every test group with its original + variants and
 * first-party performance (impressions, CTA clicks, click-through rate, time
 * on page), with the leading version highlighted.
 */
export default async function SplitTestingPage() {
  const groups = await listSplitGroupsWithMembers();

  return (
    <div className="px-5 py-4">
      <PageHeader title="Split Testing" />
      <SplitTestingPanel groups={groups} />
    </div>
  );
}
