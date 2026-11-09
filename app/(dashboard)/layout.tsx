import * as React from "react";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { CommandMenu } from "@/components/CommandMenu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RootSidebar } from "@/components/dashboard/RootSidebar";
import { FileManagerSidebar } from "@/components/file-manager/FileManagerSidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { HeaderNewProjectButton } from "@/components/dashboard/HeaderNewProjectButton";
import { readWorkspaceConfig } from "@/lib/storage/config-store";
import { storageConnection } from "@/db";

export const dynamic = "force-dynamic";

/** Authenticated surfaces are never useful as search results. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Dashboard root layout.
 * Includes a simple sidebar base structure.
 *
 * Auth is enforced conditionally: in cloud/SaaS mode or when Clerk is configured,
 * every page is protected. In local file mode, auth is bypassed for zero configuration.
 */
export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  if (storageConnection.authRequired && process.env.CLERK_SECRET_KEY) {
    await auth.protect();
  }

  // Same fallback the Settings → Workspace Name form seeds, so the sidebar and
  // the form never disagree about the current name.
  const workspaceName = readWorkspaceConfig().workspaceName ?? "My Workspace";

  return (
    <AuthProvider>
      <SidebarProvider>
        <div className="bg-background flex h-dvh w-full max-w-full overflow-hidden">
          {storageConnection.features.fileManager ? (
            <FileManagerSidebar workspaceName={workspaceName} />
          ) : (
            <RootSidebar workspaceName={workspaceName} />
          )}

          {/* Main Content Area */}
          <main
            id="main-content"
            tabIndex={-1}
            className="relative flex min-w-0 flex-1 flex-col overflow-hidden outline-none"
          >
            <header className="border-border/60 bg-background/60 absolute inset-x-0 top-0 z-10 flex h-14 items-center border-b px-4 backdrop-blur-md sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
              <div className="flex flex-1 items-center justify-start">
                <SidebarTrigger className="-ml-1 h-9 w-9" />
              </div>

              <div className="flex flex-1 items-center justify-end">
                <HeaderNewProjectButton />
              </div>
            </header>
            <div className="scrollbar-subtle flex-1 overflow-auto pt-14 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
              {children}
            </div>
            <MobileBottomNav />
          </main>
        </div>
        <CreateProjectDialog />
        <CommandMenu />
      </SidebarProvider>
    </AuthProvider>
  );
}
