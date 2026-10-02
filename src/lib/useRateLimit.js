import { useRef, useCallback } from 'react';

/**
 * useRateLimit - Simple client-side rate limiting hook
 * Prevents rapid re-submissions within a specified time window (default 2.5s)
 *
 * @param {number} minIntervalMs - Minimum time between submissions (default 2500ms)
 * @returns {object} { isPending, execute } - isPending indicates if in cooldown, execute wraps async function
 */
export function useRateLimit(minIntervalMs = 2500) {
  const lastSubmitRef = useRef(0);

  const execute = useCallback(async (fn) => {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitRef.current;

    if (timeSinceLastSubmit < minIntervalMs) {
      // Too soon - reject the submission
      const remainingMs = minIntervalMs - timeSinceLastSubmit;
      throw new Error(`rate_limited:${remainingMs}`);
    }

    // Update timestamp and execute
    lastSubmitRef.current = now;
    return await fn();
  }, [minIntervalMs]);

  const isPending = useCallback(() => {
    const now = Date.now();
    return now - lastSubmitRef.current < minIntervalMs;
  }, [minIntervalMs]);

  const getRemainingMs = useCallback(() => {
    const now = Date.now();
    const remaining = minIntervalMs - (now - lastSubmitRef.current);
    return Math.max(0, remaining);
  }, [minIntervalMs]);

  return { execute, isPending, getRemainingMs };
}