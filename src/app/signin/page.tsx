import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signInAction } from "@/app/actions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const session = await auth();
  const params = await searchParams;
  if (session) redirect(params.callbackUrl ?? "/");

  const errMsg = params.error ? decodeURIComponent(params.error) : null;

  const callbackUrl = params.callbackUrl ?? "/";

  async function signInMicrosoft() {
    "use server";
    await signInAction("microsoft-entra-id", callbackUrl);
  }

  async function signInGoogle() {
    "use server";
    await signInAction("google", callbackUrl);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Macro Estimator</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to continue.
        </p>

        {errMsg ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300">
            {errMsg}
          </div>
        ) : null}

        <form action={signInMicrosoft} className="mt-6">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md bg-[#1b1b1b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-black"
          >
            Sign in with Microsoft
          </button>
        </form>

        <form action={signInGoogle} className="mt-3">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md border border-border bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
