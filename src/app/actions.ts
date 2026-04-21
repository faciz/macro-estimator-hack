"use server";

import { signIn, signOut } from "@/auth";

export async function signInAction(provider: string, callbackUrl: string) {
  const safe = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";
  await signIn(provider, { redirectTo: safe });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}
