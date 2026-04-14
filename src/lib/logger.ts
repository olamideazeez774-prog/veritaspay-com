// Production-safe logging utility
// In production, errors are batched and sent to monitoring. In development, all logs are shown.

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === "development";

// Error batching for production
interface ErrorReport {
  message: string;
  error?: string;
  stack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

const errorQueue: ErrorReport[] = [];
const MAX_QUEUE_SIZE = 10;
const FLUSH_INTERVAL_MS = 30000; // 30 seconds

// Flush errors to backend or external service
async function flushErrors(): Promise<void> {
  if (errorQueue.length === 0) return;

  const errorsToSend = [...errorQueue];
  errorQueue.length = 0; // Clear queue

  try {
    // Try to send to your backend logging endpoint
    const { supabase } = await import("@/integrations/supabase/client");
    // Use type assertion since error_logs table is not in generated types
    await (supabase as any).from("error_logs").insert(
      errorsToSend.map(e => ({
        message: e.message.slice(0, 500),
        error_details: e.error?.slice(0, 1000),
        stack_trace: e.stack?.slice(0, 2000),
        url: e.url.slice(0, 500),
        user_agent: e.userAgent.slice(0, 500),
        created_at: new Date(e.timestamp).toISOString(),
      }))
    );
  } catch {
    // If backend fails, keep in queue for retry (limited)
    if (errorQueue.length < MAX_QUEUE_SIZE * 2) {
      errorQueue.unshift(...errorsToSend.slice(0, 5));
    }
  }
}

// Set up periodic flushing in production
if (!isDevelopment) {
  setInterval(flushErrors, FLUSH_INTERVAL_MS);
  // Flush on page unload
  window.addEventListener("beforeunload", () => {
    if (errorQueue.length > 0) {
      navigator.sendBeacon?.("/api/log", JSON.stringify(errorQueue));
    }
  });
}

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
    // In production, warnings are logged silently to backend
    if (!isDevelopment) {
      const warning = args.map(a => (typeof a === "string" ? a : safeStringify(a))).join(" ");
      if (errorQueue.length < MAX_QUEUE_SIZE) {
        errorQueue.push({
          message: `[Warning] ${warning.slice(0, 200)}`,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      }
    }
  },
  error: (message: string, error?: unknown) => {
    // In development, log full error details
    if (isDevelopment) {
      console.error(message, error);
      return;
    }

    // In production, queue error for batching
    const errorReport: ErrorReport = {
      message: message.slice(0, 500),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    if (error instanceof Error) {
      errorReport.error = error.message.slice(0, 1000);
      errorReport.stack = error.stack?.slice(0, 2000);
    } else if (typeof error === "string") {
      errorReport.error = error.slice(0, 1000);
    } else if (error !== undefined) {
      try {
        errorReport.error = JSON.stringify(error).slice(0, 1000);
      } catch {
        errorReport.error = "[Unserializable error]";
      }
    }

    // Add to queue
    if (errorQueue.length < MAX_QUEUE_SIZE) {
      errorQueue.push(errorReport);
    }

    // Always show minimal error in console for debugging
    console.error(`[Error] ${message}`);

    // Trigger immediate flush if critical
    if (message.includes("critical") || message.includes("fatal")) {
      void flushErrors();
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  // Force flush errors (useful for critical operations)
  flushErrors,
  // Get current queue size (for monitoring)
  getPendingErrorCount: () => errorQueue.length,
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
