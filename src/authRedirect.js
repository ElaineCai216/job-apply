import { Capacitor } from "@capacitor/core";

export function authRedirectUrl(locationLike = window.location) {
  if (Capacitor.isNativePlatform()) return "com.elaine.applydesk://login-callback";
  if (locationLike.protocol === "applydesk:") return "applydesk://login-callback";
  return `${locationLike.origin}${locationLike.pathname}`;
}

export function sessionTokensFromUrl(url) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.hash.slice(1));
  return { code: parsed.searchParams.get("code"), access_token: params.get("access_token"), refresh_token: params.get("refresh_token") };
}
