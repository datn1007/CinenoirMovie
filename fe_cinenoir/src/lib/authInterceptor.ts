import { AUTH_TOKEN_KEY } from "./apiConfig";

export const AUTH_EXPIRED_EVENT = "cinenoir:auth-expired";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    // Malformed token: treat as expired so the user gets logged out
    // instead of the app silently failing on every subsequent call.
    return true;
  }
}

let installed = false;

/**
 * Patches the global fetch once so any 401/403 response caused by an
 * expired/invalid JWT triggers an app-wide logout instead of leaving
 * each screen to fail silently (previously: blank white screen).
 * A 403 from a valid, non-expired token (role/permission mismatch) is
 * left alone so normal per-screen error handling still applies.
 */
export function installAuthInterceptor() {
  if (installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);

    if (response.status === 401 || response.status === 403) {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token && isTokenExpired(token)) {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      }
    }

    return response;
  };
}
