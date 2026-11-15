const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (buckets.get(key) ?? []).filter((ts) => ts > cutoff);

  if (timestamps.length >= maxRequests) {
    buckets.set(key, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, remaining: maxRequests - timestamps.length };
}
