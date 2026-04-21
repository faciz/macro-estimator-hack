import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "me_session";
const STATE_COOKIE = "me_oauth_state";
const SESSION_TTL_SEC = 60 * 60 * 8; // 8 hours
const STATE_TTL_SEC = 60 * 10; // 10 minutes

export interface SessionPayload {
  sub: string;
  name?: string;
  email?: string;
  exp: number;
}

interface OAuthStatePayload {
  state: string;
  nonce: string;
  codeVerifier: string;
  callbackUrl: string;
  exp: number;
}

function b64urlEncode(buf: Buffer | string): string {
  return (buf instanceof Buffer ? buf : Buffer.from(buf)).toString("base64url");
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function getSecret(): Buffer {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return Buffer.from(s);
}

function sign(payloadB64: string): string {
  return b64urlEncode(createHmac("sha256", getSecret()).update(payloadB64).digest());
}

function verify(payloadB64: string, sigB64: string): boolean {
  const expected = sign(payloadB64);
  const a = Buffer.from(expected);
  const b = Buffer.from(sigB64);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function encodeToken<T>(payload: T): string {
  const body = b64urlEncode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function decodeToken<T extends { exp?: number }>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (!verify(body, sig)) return null;
  try {
    const parsed = JSON.parse(b64urlDecode(body).toString("utf8")) as T;
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function pkceVerifier(): string {
  return b64urlEncode(randomBytes(32));
}

export function pkceChallenge(verifier: string): string {
  return b64urlEncode(createHash("sha256").update(verifier).digest());
}

export function randomState(): string {
  return b64urlEncode(randomBytes(16));
}

function getIssuer(): string {
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER;
  if (!issuer) throw new Error("AUTH_MICROSOFT_ENTRA_ID_ISSUER is not set");
  return issuer.replace(/\/+$/, "");
}

function getClientId(): string {
  const id = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
  if (!id) throw new Error("AUTH_MICROSOFT_ENTRA_ID_ID is not set");
  return id;
}

function getClientSecret(): string {
  const s = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
  if (!s) throw new Error("AUTH_MICROSOFT_ENTRA_ID_SECRET is not set");
  return s;
}

/**
 * Resolve the origin the browser used to reach this server. Honors the
 * `Host` header (and `X-Forwarded-Proto` if present) so the post-signin
 * redirect and cookie scope both line up on the user-visible hostname
 * rather than the bind address Next.js listens on.
 */
export function getOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function redirectUriFor(origin: string): string {
  return `${origin}/api/auth/callback/microsoft-entra-id`;
}

export function authorizationUrl(params: {
  state: string;
  nonce: string;
  codeChallenge: string;
  redirectUri: string;
}): string {
  const tenantBase = getIssuer().replace(/\/v2\.0$/, "");
  const authz = new URL(`${tenantBase}/oauth2/v2.0/authorize`);
  authz.searchParams.set("client_id", getClientId());
  authz.searchParams.set("response_type", "code");
  authz.searchParams.set("redirect_uri", params.redirectUri);
  authz.searchParams.set("response_mode", "query");
  authz.searchParams.set("scope", "openid profile email");
  authz.searchParams.set("state", params.state);
  authz.searchParams.set("nonce", params.nonce);
  authz.searchParams.set("code_challenge", params.codeChallenge);
  authz.searchParams.set("code_challenge_method", "S256");
  return authz.toString();
}

function tokenEndpoint(): string {
  const tenantBase = getIssuer().replace(/\/v2\.0$/, "");
  return `${tenantBase}/oauth2/v2.0/token`;
}

export async function exchangeCode(opts: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ id_token?: string; access_token?: string }> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
    scope: "openid profile email",
  });
  const res = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`token exchange failed (${res.status}): ${text}`);
  }
  return JSON.parse(text);
}

export function decodeIdToken(idToken: string): {
  sub?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
} | null {
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(b64urlDecode(parts[1]).toString("utf8"));
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const token = encodeToken<SessionPayload>({ ...payload, exp });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeToken<SessionPayload>(raw);
}

export async function setStateCookie(payload: Omit<OAuthStatePayload, "exp">) {
  const exp = Math.floor(Date.now() / 1000) + STATE_TTL_SEC;
  const token = encodeToken<OAuthStatePayload>({ ...payload, exp });
  const jar = await cookies();
  jar.set(STATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: STATE_TTL_SEC,
  });
}

export async function consumeStateCookie(): Promise<OAuthStatePayload | null> {
  const jar = await cookies();
  const raw = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  if (!raw) return null;
  return decodeToken<OAuthStatePayload>(raw);
}
