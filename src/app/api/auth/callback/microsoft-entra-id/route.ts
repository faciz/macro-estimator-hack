import { NextResponse } from "next/server";
import {
  consumeStateCookie,
  decodeIdToken,
  exchangeCode,
  getOrigin,
  redirectUriFor,
  setSessionCookie,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = getOrigin(req);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");
  const state = url.searchParams.get("state");

  if (err) {
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(errDesc ?? err)}`, origin)
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/signin?error=missing_code", origin));
  }

  const stored = await consumeStateCookie();
  if (!stored || stored.state !== state) {
    return NextResponse.redirect(new URL("/signin?error=bad_state", origin));
  }

  try {
    const tokens = await exchangeCode({
      code,
      redirectUri: redirectUriFor(origin),
      codeVerifier: stored.codeVerifier,
    });
    if (!tokens.id_token) {
      return NextResponse.redirect(new URL("/signin?error=no_id_token", origin));
    }
    const claims = decodeIdToken(tokens.id_token);
    if (!claims?.sub) {
      return NextResponse.redirect(new URL("/signin?error=bad_id_token", origin));
    }

    await setSessionCookie({
      sub: claims.sub,
      name: claims.name,
      email: claims.email ?? claims.preferred_username,
    });

    const dest = stored.callbackUrl.startsWith("/") ? stored.callbackUrl : "/";
    return NextResponse.redirect(new URL(dest, origin));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "exchange_failed";
    console.error("[oidc-callback] token exchange error:", msg);
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(msg.slice(0, 200))}`, origin)
    );
  }
}
