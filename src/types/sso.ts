/** User profile returned by sso.lightningworks.io /api/verify */
export interface SSOUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: "user" | "admin" | "superadmin";
  avatar_url: string | null;
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

/** What we seal into the session cookie. Marketing site keeps this small. */
export interface SessionData {
  user: SSOUser;
  expiresAt: number;
}
