/**
 * Post-type registry for the Website Builder. One row per WP custom post type
 * discovered during migration (see scripts/extractor/discover-sitemap.ts).
 *
 * - `slug` is the URL segment under /admin/website/{slug}.
 * - `postType` matches `url_inventory.post_type`.
 * - `templateSlug` matches `page_templates.slug` — this is the template a new
 *   item of this type defaults to.
 * - `columns` controls which columns appear in the WP-style list view.
 * - `taxonomies` lists the `taxonomy_terms.taxonomy` values that apply.
 */

export type PostTypeColumn =
  | "title"
  | "author"
  | "categories"
  | "tags"
  | "event_category"
  | "date";

export type PostTypeConfig = {
  slug: string;
  postType: string;
  label: string;
  pluralLabel: string;
  templateSlug: string;
  hierarchical: boolean;
  columns: PostTypeColumn[];
  taxonomies: string[];
  /** Lucide icon name (kebab-case PascalCase'd in component). */
  icon: string;
};

export const POST_TYPES: PostTypeConfig[] = [
  {
    slug: "pages",
    postType: "page",
    label: "Page",
    pluralLabel: "Pages",
    templateSlug: "single-page",
    hierarchical: true,
    columns: ["title", "author", "date"],
    taxonomies: [],
    icon: "FileText",
  },
  {
    slug: "posts",
    postType: "post",
    label: "Post",
    pluralLabel: "Posts",
    templateSlug: "single-post",
    hierarchical: false,
    columns: ["title", "author", "categories", "tags", "date"],
    taxonomies: ["category", "post_tag"],
    icon: "Pin",
  },
  {
    slug: "retreats",
    postType: "retreat",
    label: "Retreat",
    pluralLabel: "Retreats",
    templateSlug: "single-retreat",
    hierarchical: false,
    columns: ["title", "author", "event_category", "date"],
    taxonomies: ["event_category"],
    icon: "Mountain",
  },
  {
    slug: "accommodations",
    postType: "accommodations",
    label: "Accommodation",
    pluralLabel: "Accommodations",
    templateSlug: "single-accommodations",
    hierarchical: false,
    columns: ["title", "date"],
    taxonomies: [],
    icon: "Bed",
  },
  {
    slug: "yoga-teachers",
    postType: "yoga_teacher",
    label: "Yoga Teacher",
    pluralLabel: "Yoga Teachers",
    templateSlug: "single-yoga_teacher",
    hierarchical: false,
    columns: ["title", "date"],
    taxonomies: [],
    icon: "User",
  },
  {
    slug: "guest-yoga-teachers",
    postType: "guest_yoga_teacher",
    label: "Guest Yoga Teacher",
    pluralLabel: "Guest Yoga Teachers",
    templateSlug: "single-guest_yoga_teacher",
    hierarchical: false,
    columns: ["title", "date"],
    taxonomies: [],
    icon: "Users",
  },
  {
    slug: "ytt",
    postType: "ytt",
    label: "YTT Page",
    pluralLabel: "YTT (Teacher Training)",
    templateSlug: "single-ytt",
    hierarchical: false,
    columns: ["title", "author", "date"],
    taxonomies: [],
    icon: "GraduationCap",
  },
  {
    slug: "recipes",
    postType: "cp_recipe",
    label: "Recipe",
    pluralLabel: "Recipes",
    templateSlug: "single-cp_recipe",
    hierarchical: false,
    columns: ["title", "author", "date"],
    taxonomies: [],
    icon: "ChefHat",
  },
  {
    slug: "news-coverage",
    postType: "news_coverage",
    label: "News Coverage",
    pluralLabel: "News Coverage",
    templateSlug: "single-news_coverage",
    hierarchical: false,
    columns: ["title", "date"],
    taxonomies: [],
    icon: "Newspaper",
  },
  {
    slug: "guest-testimonials",
    postType: "guest_testimonials",
    label: "Guest Testimonial",
    pluralLabel: "Guest Testimonials",
    templateSlug: "single-guest_testimonials",
    hierarchical: false,
    columns: ["title", "date"],
    taxonomies: [],
    icon: "Quote",
  },
];

export function getPostTypeBySlug(slug: string): PostTypeConfig | null {
  return POST_TYPES.find((p) => p.slug === slug) ?? null;
}
