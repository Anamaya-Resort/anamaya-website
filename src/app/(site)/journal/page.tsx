// Temporary/secondary URL for the blog index so it's viewable live without
// a proxy.ts change. Renders the exact same page as /yoga-blog-articles
// (which is currently intercepted by the WordPress snapshot fallback until
// its path is added to HARDCODED_PUBLIC in src/proxy.ts). /journal has no
// frozen snapshot, so the proxy lets it fall through to this route.
export const dynamic = "force-dynamic";
export { default, metadata } from "../yoga-blog-articles/page";
