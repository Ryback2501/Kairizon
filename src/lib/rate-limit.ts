const lastCall = new Map<string, number>();

/**
 * Returns true if the given key was called within the cooldown window.
 * Call allow() to record the current call time.
 */
export function isRateLimited(key: string, cooldownMs: number): boolean {
  const last = lastCall.get(key);
  return last !== undefined && Date.now() - last < cooldownMs;
}

export function allow(key: string): void {
  // Evict entries older than 1 hour to prevent unbounded growth
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [k, t] of lastCall) {
    if (t < cutoff) lastCall.delete(k);
  }
  lastCall.set(key, Date.now());
}
