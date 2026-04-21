"use server";

import { signIn, signOut } from "@/auth";

export async function signInAction(callbackUrl: string) {
  const safe = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";
  await signIn("microsoft-entra-id", { redirectTo: safe });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}
