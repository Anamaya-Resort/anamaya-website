"use client";

import type { UiAgentContent } from "@/types/blocks";
import VisitorAgent from "@/components/ai/VisitorAgent";

/**
 * Block-typed wrapper around VisitorAgent. The agent's chrome (bubble
 * position, panel sizing) is owned by VisitorAgent itself — overlay_z
 * etc. on the block content are advisory and not currently consumed,
 * since the agent's fixed positioning is hard-coded in the bubble's
 * CSS. Only `property_id_scope` is plumbed through today; future
 * variants can add anchor/z support if needed.
 *
 * Visibility still gates on /api/ai/agent-config — when the tenant
 * has the agent disabled, VisitorAgent renders nothing.
 */
export default function UiAgentBlock({
  content,
  preview,
}: {
  content: UiAgentContent;
  /** Admin block-preview only: wrap the floating agent in a sized in-flow
   *  box so the snapshot has real height. Never set on public paths. */
  preview?: boolean;
}) {
  const c = content ?? {};
  const agent = <VisitorAgent propertyId={c.property_id_scope ?? null} />;
  // Admin preview: the agent's chrome is position:fixed, so on its own it
  // leaves the preview body ~0-tall. A sized relative wrapper gives the
  // snapshot visible height regardless of whether the agent is enabled.
  if (preview) {
    return (
      <div className="relative w-full" style={{ height: 360 }}>
        {agent}
      </div>
    );
  }
  return agent;
}
