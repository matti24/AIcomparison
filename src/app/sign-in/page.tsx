import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { NewsletterForm } from "@/components/newsletter";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true }, alternates: { canonical: "/sign-in" } };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const accountsEnabled = process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === "true";

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-16">
      <div className="panel w-full max-w-[420px] p-8">
        <BrandMark className="size-8" />
        <h1 className="mt-5 text-2xl">Sign in to AI Compare</h1>
        {accountsEnabled && url && anonKey ? (
          <>
            <p className="mt-2 mb-6 text-[14.5px] text-muted-foreground">We&apos;ll email you a secure sign-in link — no password needed. Favorites and watchlists are currently saved in this browser; account syncing and email alerts are planned.</p>
            <SignInForm url={url} anonKey={anonKey} next={next} />
          </>
        ) : (
          <>
            <p className="mt-2 text-[14.5px] text-muted-foreground">Accounts are launching soon. Until then, your <Link href="/favorites" className="underline underline-offset-2">favorites</Link>, <Link href="/watchlist" className="underline underline-offset-2">watchlist</Link>, and comparisons are saved in this browser — no sign-up needed.</p>
            <p className="mt-6 mb-2 text-[13px] font-medium">Get notified when accounts launch</p>
            <NewsletterForm source="sign-in" />
          </>
        )}
        <p className="mt-6 text-xs text-muted-foreground">By continuing you agree to our <Link href="/terms" className="underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.</p>
      </div>
    </div>
  );
}
