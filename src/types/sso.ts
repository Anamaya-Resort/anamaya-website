/** User profile returned by sso.lightningworks.io /api/verify */
export interface SSOUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: "user" | "admin" | "superadmin";
  avatar_url: string | null;
  // Optional avatar styling metadata returned by the LightningWorks SSO.
  // Video avatars (mp4/webm) can have a two-color ring, pan, and zoom.
  avatar_outer_color?: string | null;
  avatar_inner_color?: string | null;
  avatar_pan_x?: number | null; // 0–1, default 0.5 = center
  avatar_pan_y?: number | null;
  avatar_zoom?: number | null;  // scale factor, default 1
  created_at: string;
  last_sign_in: string;
}

export interface SSOVerifySuccess {
  valid: true;
  user: SSOUser;
}

export interface SSOVerifyError {
  error: string;
}

export type SSOVerifyResponse = SSOVerifySuccess | SSOVerifyError;

export interface SessionData {
  user: SSOUser;
  expiresAt: number;
}
