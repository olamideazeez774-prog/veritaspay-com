import { useState, useCallback, useRef, useMemo } from "react";

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  isLocked: boolean;
  lockExpiry: number | null;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60 * 1000, // 1 minute
  lockoutMs: 15 * 60 * 1000, // 15 minutes
};

export function useRateLimit(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const [state, setState] = useState<RateLimitState>({
    attempts: 0,
    lastAttempt: 0,
    isLocked: false,
    lockExpiry: null,
  });

  const storageKey = useRef(`rate_limit_${window.location.pathname}`);

  // Load from localStorage on mount
  useState(() => {
    try {
      const stored = localStorage.getItem(storageKey.current);
      if (stored) {
        const parsed = JSON.parse(stored) as RateLimitState;
        // Check if lock has expired
        if (parsed.lockExpiry && Date.now() > parsed.lockExpiry) {
          parsed.isLocked = false;
          parsed.lockExpiry = null;
          parsed.attempts = 0;
        }
        setState(parsed);
      }
    } catch {
      // Ignore localStorage errors
    }
  });

  const saveState = useCallback((newState: RateLimitState) => {
    try {
      localStorage.setItem(storageKey.current, JSON.stringify(newState));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const recordAttempt = useCallback(() => {
    setState((prev) => {
      const now = Date.now();
      
      // Reset attempts if window has passed
      const attempts = now - prev.lastAttempt > finalConfig.windowMs ? 1 : prev.attempts + 1;
      
      // Check if we should lock
      const shouldLock = attempts >= finalConfig.maxAttempts;
      const lockExpiry = shouldLock ? now + finalConfig.lockoutMs : null;
      
      const newState: RateLimitState = {
        attempts,
        lastAttempt: now,
        isLocked: shouldLock,
        lockExpiry,
      };
      
      saveState(newState);
      return newState;
    });
  }, [finalConfig, saveState]);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    
    // Check if currently locked
    if (state.isLocked) {
      if (state.lockExpiry && now > state.lockExpiry) {
        // Lock has expired, reset
        const newState: RateLimitState = {
          attempts: 0,
          lastAttempt: 0,
          isLocked: false,
          lockExpiry: null,
        };
        setState(newState);
        saveState(newState);
        return { allowed: true, remainingAttempts: finalConfig.maxAttempts, lockExpiry: null };
      }
      
      // Still locked
      return { 
        allowed: false, 
        remainingAttempts: 0, 
        lockExpiry: state.lockExpiry 
      };
    }
    
    // Check if window has passed and reset
    if (now - state.lastAttempt > finalConfig.windowMs) {
      return { 
        allowed: true, 
        remainingAttempts: finalConfig.maxAttempts, 
        lockExpiry: null 
      };
    }
    
    // Calculate remaining attempts
    const remainingAttempts = Math.max(0, finalConfig.maxAttempts - state.attempts);
    
    return { 
      allowed: remainingAttempts > 0, 
      remainingAttempts, 
      lockExpiry: null 
    };
  }, [state, finalConfig, saveState]);

  const reset = useCallback(() => {
    const newState: RateLimitState = {
      attempts: 0,
      lastAttempt: 0,
      isLocked: false,
      lockExpiry: null,
    };
    setState(newState);
    saveState(newState);
  }, [saveState]);

  const getTimeRemaining = useCallback(() => {
    if (!state.isLocked || !state.lockExpiry) return 0;
    return Math.max(0, state.lockExpiry - Date.now());
  }, [state]);

  return {
    recordAttempt,
    checkRateLimit,
    reset,
    getTimeRemaining,
    isLocked: state.isLocked,
    attempts: state.attempts,
  };
}

export default useRateLimit;
