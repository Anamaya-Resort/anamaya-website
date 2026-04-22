import type { RichTextContent } from "@/types/blocks";
import ProseHtml from "@/components/ProseHtml";

export default function RichTextBlock({ content }: { content: RichTextContent }) {
  if (!content?.html) return null;
  return (
    <section className="bg-white px-6 py-12">
      <ProseHtml html={content.html} />
    </section>
  );
}
