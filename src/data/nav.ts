// Sitewide navigation data — extracted from v2's Elementor-built header/slide-out menu.
// Keep this in code for now; later phases may move to Supabase (wp_nav_menus).

export type NavItem = {
  label: string;
  href?: string;      // absent for group headers / dropdown parents
  children?: NavItem[];
};

export const SIDE_MENU: NavItem[] = [
  { label: "Calendar", href: "/rg-calendar/" },
  { label: "Home", href: "/" },
  {
    label: "Yoga Retreats",
    children: [
      { label: "Retreat Rates",      href: "/rates-new/" },
      { label: "Retreat Types",      href: "/retreats/" },
      { label: "FAQs",               href: "/faqs-page/" },
      { label: "Special Retreats",   href: "/special-retreats/" },
    ],
  },
  {
    label: "Yoga Teacher Training",
    children: [
      { label: "YTT Info & Rates",   href: "/rates-yoga-teacher-training/" },
      { label: "YTT Calendar",       href: "/calendar-yoga-teacher-training/" },
      { label: "YTT FAQs",           href: "/faqs-for-ytts/" },
    ],
  },
  { label: "Spa – Massage & Beauty", href: "/spa-massage-costa-rica/" },
  {
    label: "About Us",
    children: [
      { label: "Accommodations",         href: "/accommodations/" },
      { label: "Traveling To Anamaya",   href: "/travel/" },
      { label: "Photo Galleries",        href: "/photo-galleries/" },
      { label: "On the Blog",            href: "/yoga-blog-articles/" },
      { label: "Scuba Certification",    href: "/scuba-certification-anamaya-resort/" },
      { label: "Testimonials",           href: "/guest_testimonials/" },
      { label: "Press",                  href: "/news-coverage-anamaya/" },
      { label: "Contact Us",             href: "/contact/" },
      { label: "Host your own Retreat",  href: "/host-your-own-retreat-at-anamaya/" },
    ],
  },
  {
    label: "Shop",
    children: [
      { label: "Anamaya Gift Certificates", href: "/anamaya-gift-certificates/" },
      { label: "Cookbook Membership",       href: "/cookbook-membership/" },
      {
        label: "Intuitive Marketing Membership (for yoga teachers)",
        href: "https://www.kelseymatheson.com/wellness-entrepreneur-mastermind",
      },
    ],
  },
];

export const FOOTER_COLUMNS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "The Experience",
    items: [
      { label: "Accommodations",         href: "/accommodations/" },
      { label: "Cuisine",                href: "/cuisine" },
      { label: "Map of Anamaya",         href: "/property-map/" },
      { label: "Pool",                   href: "/infinity-pool/" },
      { label: "Spa & Massages",         href: "/spa-massage/" },
      { label: "Waterfall & Trails Map", href: "/waterfall-and-trails-map/" },
      { label: "Yoga Decks",             href: "/photo-gallery/yoga-deck/" },
      { label: "Bird Watching",          href: "/costa-rica-birdwatching/" },
    ],
  },
  {
    heading: "Travel & Contact",
    items: [
      { label: "Travel & Directions",   href: "/travel/" },
      { label: "TripAdvisor Reviews",   href: "https://www.tripadvisor.com/Hotel_Review-g309278-d1593953-Reviews-Anamaya_Resort" },
      { label: "Weather in Montezuma",  href: "/montezuma-weather/" },
      { label: "Cookbook Membership",   href: "/cookbook-membership/" },
      { label: "Cookbook Login",        href: "/cookbook-membership-dashboard/" },
      { label: "Contact Us",            href: "/contact/" },
    ],
  },
  {
    heading: "Stories & Voices",
    items: [
      { label: "Featured Blog & Articles", href: "/yoga-blog-articles/" },
      { label: "Press Coverage",           href: "/news-coverage-anamaya" },
      { label: "Testimonials",             href: "/testimonials/" },
    ],
  },
];

export const SOCIAL_LINKS = [
  { label: "Facebook",  href: "https://www.facebook.com/Anamayaresort" },
  { label: "Twitter",   href: "https://twitter.com/anamayaresort" },
  { label: "YouTube",   href: "https://www.youtube.com/channel/UC993Xg_jCeAy3UhoiAA9aTQ" },
  { label: "Pinterest", href: "https://www.pinterest.com/anamayaresort/" },
  { label: "Instagram", href: "https://www.instagram.com/anamayaresort/" },
];

export const BOOK_CTA = {
  label: "BOOK YOUR STAY",
  href: "/rg-calendar/",
};
