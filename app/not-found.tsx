import Link from "next/link";
import { ArrowLeftIcon, SearchBigIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Root-level 404 page.
 * Catches any unmatched routes across the entire application.
 */
export default function NotFound() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8">
      <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
        <PikaIcon
          icon={SearchBigIcon}
          className="text-muted-foreground size-10"
        />
      </div>
      <div className="text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">
          404
        </h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          The page you&apos;re looking for doesn&apos;t exist. It may have been
          moved or the URL might be incorrect.
        </p>
      </div>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <PikaIcon icon={ArrowLeftIcon} className="mr-2 size-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
