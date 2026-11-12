import Link from "next/link";
import { ArrowLeftIcon, FolderIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Shown when a project slug doesn't match any project in the database.
 */
export default function ProjectNotFound() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <PikaIcon icon={FolderIcon} className="text-muted-foreground size-8" />
      </div>
      <div className="text-center">
        <h2 className="text-foreground text-xl font-semibold">
          Project not found
        </h2>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          The project you&apos;re looking for doesn&apos;t exist or may have
          been deleted.
        </p>
      </div>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <PikaIcon icon={ArrowLeftIcon} className="mr-2 size-4" />
        Back to Projects
      </Link>
    </div>
  );
}
