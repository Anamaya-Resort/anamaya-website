/**
 * LightningWorks SSO configuration.
 * Uses the same sso.lightningworks.io portal as AnamayOS (ao.anamaya.com).
 */

export function getSSOConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_SSO_URL ?? "https://sso.lightningworks.io";
  // We reuse AO's app slug so one SSO login works for both sites.
  const appSlug = process.env.NEXT_PUBLIC_SSO_APP_SLUG ?? "anamayos";
  return { baseUrl, appSlug };
}

export function getSSOLoginUrl(callbackUrl: string): string {
  const { baseUrl, appSlug } = getSSOConfig();
  const params = new URLSearchParams({ app: appSlug, redirect: callbackUrl });
  return `${baseUrl}/login?${params.toString()}`;
}

export function getSSOVerifyUrl(): string {
  const { baseUrl } = getSSOConfig();
  return `${baseUrl}/api/verify`;
}

// Cookie namespaced to the website so it doesn't collide with AO's ao_session.
export const SESSION_COOKIE = "anamaya_web_session";
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_S * 1000;
