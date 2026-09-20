/**
 * Sealed external-URL handling: vendor/user-controlled URLs are opened only
 * after a scheme allowlist check. `javascript:`, `data:`, `vbscript:` and
 * other executable schemes would otherwise become stored XSS via product
 * file_url / external_url fields.
 */
const SAFE_URL_SCHEMES = ["http:", "https:", "mailto:"];

/** Returns the URL if safe to navigate to, otherwise null. */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (!SAFE_URL_SCHEMES.includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Opens a URL only if it passes the scheme allowlist. */
export function openExternalUrl(raw: string | null | undefined): boolean {
  const safe = safeExternalUrl(raw);
  if (!safe) return false;
  window.open(safe, "_blank", "noopener,noreferrer");
  return true;
}
