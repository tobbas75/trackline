/**
 * Simple in-memory sliding window rate limiter.
 *
 * Each call to `check(key)` records a timestamp for that key and removes
 * any timestamps older than `interval` ms. If the number of remaining
 * timestamps exceeds `limit`, the request is rejected.
 *
 * Expired entries are lazily cleaned on every `check` call, plus a
 * periodic sweep runs every 60 seconds to prevent unbounded growth.
 */

interface RateLimitOptions {
  /** Time window in milliseconds */
  interval: number;
  /** Maximum number of requests allowed within the window */
  limit: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

export function rateLimit({ interval, limit }: RateLimitOptions) {
  const timestamps = new Map<string, number[]>();

  // Periodic sweep to remove keys with no recent timestamps
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    timestamps.forEach((times, key) => {
      const valid = times.filter((t) => now - t < interval);
      if (valid.length === 0) {
        timestamps.delete(key);
      } else {
        timestamps.set(key, valid);
      }
    });
  }, 60_000);

  // Allow the timer to be garbage-collected if the process is shutting down
  if (sweepInterval.unref) {
    sweepInterval.unref();
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - interval;

    // Get existing timestamps and filter to the current window
    const existing = timestamps.get(key) ?? [];
    const valid = existing.filter((t) => t > windowStart);

    if (valid.length >= limit) {
      timestamps.set(key, valid);
      return { success: false, remaining: 0 };
    }

    valid.push(now);
    timestamps.set(key, valid);

    return { success: true, remaining: limit - valid.length };
  }

  return { check };
}
