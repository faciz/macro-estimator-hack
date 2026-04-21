import { NextResponse, type NextRequest } from "next/server";

const AUTH_REQUIRED = process.env.AUTH_REQUIRED === "true";
const SESSION_COOKIE = "me_session";

function b64urlToBuffer(s: string): ArrayBuffer {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

function textToBuffer(s: string): ArrayBuffer {
  const enc = new TextEncoder().encode(s);
  const buf = new ArrayBuffer(enc.byteLength);
  new Uint8Array(buf).set(enc);
  return buf;
}

async function verifySession(token: string, secret: string): Promise<boolean> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    textToBuffer(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify("HMAC", key, b64urlToBuffer(sig), textToBuffer(body));
  if (!ok) return false;
  try {
    const payloadJson = new TextDecoder().decode(b64urlToBuffer(body));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export default async function middleware(req: NextRequest) {
  if (!AUTH_REQUIRED) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/auth") || pathname === "/signin") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  const ok = token && secret ? await verifySession(token, secret) : false;

  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
