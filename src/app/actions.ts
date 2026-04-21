"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth";

export async function signInAction(callbackUrl: string) {
  const safe = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";
  redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(safe)}`);
}

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/signin");
}
