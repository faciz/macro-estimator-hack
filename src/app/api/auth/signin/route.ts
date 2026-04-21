import { NextResponse } from "next/server";
import {
  authorizationUrl,
  getOrigin,
  pkceChallenge,
  pkceVerifier,
  randomState,
  redirectUriFor,
  setStateCookie,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

async function start(req: Request) {
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get("callbackUrl") ?? "/";

  const state = randomState();
  const nonce = randomState();
  const codeVerifier = pkceVerifier();
  const codeChallenge = pkceChallenge(codeVerifier);
  const redirectUri = redirectUriFor(getOrigin(req));

  await setStateCookie({ state, nonce, codeVerifier, callbackUrl });

  return NextResponse.redirect(
    authorizationUrl({ state, nonce, codeChallenge, redirectUri })
  );
}

export const GET = start;
export const POST = start;
