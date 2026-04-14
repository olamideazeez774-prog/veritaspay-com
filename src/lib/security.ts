// Security utilities for CSRF protection and XSS prevention

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Store CSRF token in session storage (more secure than localStorage)
 */
export function setCSRFToken(token: string): void {
  sessionStorage.setItem("csrf_token", token);
}

/**
 * Retrieve CSRF token from session storage
 */
export function getCSRFToken(): string | null {
  return sessionStorage.getItem("csrf_token");
}

/**
 * Validate CSRF token against stored value
 */
export function validateCSRFToken(token: string): boolean {
  const stored = getCSRFToken();
  if (!stored) return false;
  // Use timing-safe comparison to prevent timing attacks
  if (token.length !== stored.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Sanitize user input to prevent XSS attacks
 * Removes dangerous HTML tags and attributes while preserving safe content
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";

  // Remove potentially dangerous HTML tags
  const dangerousTags = /<(script|iframe|object|embed|form|input|textarea|button|link|style)[^>]*>.*?<\/\1>/gi;
  const dangerousAttributes = /\s*(on\w+|javascript:|data:text\/html)[^=]*=["'][^"']*["']/gi;

  let sanitized = input
    .replace(dangerousTags, "")
    .replace(dangerousAttributes, "")
    .replace(/[<>]/g, (match) => (match === "<" ? "&lt;" : "&gt;"));

  return sanitized;
}

/**
 * Sanitize HTML content by stripping all tags (use for plain text fields)
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Validate URL to prevent javascript: and data: injection
 */
export function validateUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    // Block javascript: and data: protocols
    if (parsed.protocol === "javascript:" || parsed.protocol === "data:") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Escape special regex characters for safe regex construction
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rate limiting helper for client-side operations
 * Tracks attempts and enforces delays between actions
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000
  ) {}

  canAttempt(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) return true;

    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.delete(key);
      return true;
    }

    return record.count < this.maxAttempts;
  }

  recordAttempt(key: string): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (record && now - record.lastAttempt <= this.windowMs) {
      record.count++;
      record.lastAttempt = now;
    } else {
      this.attempts.set(key, { count: 1, lastAttempt: now });
    }
  }

  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return this.maxAttempts;
    return Math.max(0, this.maxAttempts - record.count);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
