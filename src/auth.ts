import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [MicrosoftEntraID],
  pages: { signIn: "/signin" },
  trustHost: true,
  callbacks: {
    authorized: ({ auth, request }) => {
      if (process.env.AUTH_REQUIRED !== "true") return true;
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/api/auth") || pathname === "/signin") return true;
      return !!auth;
    },
  },
});
