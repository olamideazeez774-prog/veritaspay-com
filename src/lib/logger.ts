// Production-safe logging utility
// In production, only errors are logged. In development, all logs are shown.

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === "development";

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};

// Helper to safely stringify objects for logging
export function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

// Helper to sanitize data for logging (removes sensitive fields)
export function sanitizeForLogging<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: string[] = ["password", "token", "secret", "key", "auth"]
): Partial<T> {
  const sanitized = { ...data };
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field as keyof T] = "[REDACTED]" as T[keyof T];
    }
  }
  return sanitized;
}
