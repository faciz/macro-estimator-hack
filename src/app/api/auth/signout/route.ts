import { NextResponse } from "next/server";
import { clearSessionCookie, getOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function signOut(req: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/signin", getOrigin(req)), { status: 303 });
}

export const GET = signOut;
export const POST = signOut;
