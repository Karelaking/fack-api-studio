import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { AuthorizeDeviceForm } from "@/components/cli/AuthorizeDeviceForm";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { storageConnection } from "@/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Authorize Fack CLI | Fack API",
  description:
    "Approve a terminal that is signing in to your Fack API Studio workspace.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CliAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}): Promise<React.JSX.Element> {
  if (storageConnection.authRequired && process.env.CLERK_SECRET_KEY) {
    await auth.protect();
  }

  const params = await searchParams;
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Fack API's — home"
        >
          <BrandLogo size={26} />
          <span className="text-sm font-extrabold tracking-tight">
            fackapi<span className="text-primary">.</span>studio
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <AuthorizeDeviceForm initialCode={rawCode} />
      </main>

      <footer className="px-5 pb-8 sm:px-8">
        <p className="text-muted-foreground mx-auto max-w-sm text-center text-[11px] leading-relaxed">
          Self-hosted, open source and MIT licensed.
        </p>
      </footer>
    </div>
  );
}
