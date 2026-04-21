import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.API_RATE_LIMIT ?? 20);
const MAX_BUCKETS = 10_000;

// Per-instance in-memory store keyed by `${ip}:${route}`. Fine for
// single-instance deployments; for multi-instance production use Redis or an
// external rate limiter.
const buckets = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function sweep(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  const cutoff = now - WINDOW_MS;
  for (const [key, times] of buckets) {
    const last = times[times.length - 1];
    if (last === undefined || last <= cutoff) buckets.delete(key);
  }
}

/**
 * Gate an API route. Returns a NextResponse to short-circuit the handler
 * (401 or 429), or null to allow the request to proceed.
 *
 * @param route Short identifier so different endpoints have independent
 *   budgets (e.g. "analyze", "thumbnail", "image").
 * @param limit Optional per-route override of the default MAX_REQUESTS.
 */
export function checkAccess(
  req: NextRequest,
  route: string,
  limit: number = MAX_REQUESTS
): NextResponse | null {
  const secret = process.env.API_SHARED_SECRET;
  if (secret) {
    const provided = req.headers.get("x-api-key");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const ip = getClientIp(req);
  const key = `${ip}:${route}`;
  const now = Date.now();
  sweep(now);

  const recent = (buckets.get(key) ?? []).filter((t) => t > now - WINDOW_MS);
  if (recent.length >= limit) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }
  recent.push(now);
  buckets.set(key, recent);
  return null;
}
