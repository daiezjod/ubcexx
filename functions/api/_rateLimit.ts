const ipRateMap = new Map<string, number[]>();
const FLOOD_WINDOW_MS = 5000;
const FLOOD_MAX_REQUESTS = 30;

export function checkFloodProtection(request: Request): { isLimited: boolean; retryAfter: number } {
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';

  const now = Date.now();
  let timestamps = ipRateMap.get(clientIp);

  if (!timestamps) {
    timestamps = [];
    ipRateMap.set(clientIp, timestamps);
  }

  const validFrom = now - FLOOD_WINDOW_MS;
  const recent = timestamps.filter((t) => t > validFrom);

  if (recent.length >= FLOOD_MAX_REQUESTS) {
    const oldestInWindow = recent[0];
    const retryAfter = Math.max(1, Math.ceil((oldestInWindow + FLOOD_WINDOW_MS - now) / 1000));
    return { isLimited: true, retryAfter };
  }

  recent.push(now);
  ipRateMap.set(clientIp, recent);

  if (ipRateMap.size > 5000) {
    for (const [ip, list] of ipRateMap.entries()) {
      const active = list.filter((t) => t > validFrom);
      if (active.length === 0) {
        ipRateMap.delete(ip);
      } else {
        ipRateMap.set(ip, active);
      }
    }
  }

  return { isLimited: false, retryAfter: 0 };
}
