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
export default function UiAgentBlock({ content }: { content: UiAgentContent }) {
  const c = content ?? {};
  return <VisitorAgent propertyId={c.property_id_scope ?? null} />;
}
