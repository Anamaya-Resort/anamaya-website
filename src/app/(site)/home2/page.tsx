// Test page that renders the "home" template via the CMS. Whatever the
// template contains is what shows here — no hard-coded sections. Use
// this as the staging ground for the new template-driven homepage.
export const dynamic = "force-dynamic";

import TemplateRenderer from "@/components/templates/TemplateRenderer";

export default function Home2() {
  return <TemplateRenderer templateSlug="home" />;
}
