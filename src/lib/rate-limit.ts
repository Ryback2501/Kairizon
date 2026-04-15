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
  lastCall.set(key, Date.now());
}
