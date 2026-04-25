import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";

export type GeneralSettings = {
  site_title: string;
  tagline: string;
  timezone: string;
};

export type DefaultMetaSettings = {
  meta_description: string;
  og_image_url: string;
};

export type TrackingSettings = {
  ga4_id: string;
  gtm_id: string;
  facebook_pixel_id: string;
  custom_head_html: string;
  custom_body_html: string;
};

export type SettingsBundle = {
  general: GeneralSettings;
  default_meta: DefaultMetaSettings;
  tracking: TrackingSettings;
};

const EMPTY: SettingsBundle = {
  general: { site_title: "", tagline: "", timezone: "" },
  default_meta: { meta_description: "", og_image_url: "" },
  tracking: {
    ga4_id: "",
    gtm_id: "",
    facebook_pixel_id: "",
    custom_head_html: "",
    custom_body_html: "",
  },
};

export async function getAllSettings(): Promise<SettingsBundle> {
  const sb = supabaseServerOrNull();
  if (!sb) return EMPTY;

  const { data } = await sb
    .from("site_settings")
    .select("key, value")
    .in("key", ["general", "default_meta", "tracking"]);

  const out: SettingsBundle = {
    general: { ...EMPTY.general },
    default_meta: { ...EMPTY.default_meta },
    tracking: { ...EMPTY.tracking },
  };
  for (const row of data ?? []) {
    if (row.key === "general") {
      Object.assign(out.general, row.value ?? {});
    } else if (row.key === "default_meta") {
      Object.assign(out.default_meta, row.value ?? {});
    } else if (row.key === "tracking") {
      Object.assign(out.tracking, row.value ?? {});
    }
  }
  return out;
}

export async function getTrackingSettings(): Promise<TrackingSettings> {
  const all = await getAllSettings();
  return all.tracking;
}
