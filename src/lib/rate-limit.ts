import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.API_RATE_LIMIT ?? 20);

// Per-instance in-memory store. Fine for single-instance deployments; for
// multi-instance production use Redis or an external rate limiter.
const buckets = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Gate an API route. Returns a NextResponse to short-circuit the handler
 * (401 or 429), or null to allow the request to proceed.
 */
export function checkAccess(req: NextRequest): NextResponse | null {
  const secret = process.env.API_SHARED_SECRET;
  if (secret) {
    const provided = req.headers.get("x-api-key");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const recent = (buckets.get(ip) ?? []).filter((t) => t > now - WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }
  recent.push(now);
  buckets.set(ip, recent);
  return null;
}
