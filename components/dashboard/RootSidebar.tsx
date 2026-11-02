"use client";

// The search row uses `role="button"` because it wraps a read-only input;
// a native <button> cannot contain an input control.
/* eslint-disable jsx-a11y/prefer-tag-over-role */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileDialog } from "@/components/dashboard/ProfileDialog";
import { useSafeUser } from "@/hooks/use-safe-user";
import {
  RiLayoutGridLine,
  RiFileList3Line,
  RiBarChartBoxLine,
  RiEarthLine,
  RiKey2Line,
  RiSettings3Line,
  RiSearchLine,
  RiArrowUpDownLine,
  RiMoreFill,
  RiNotification3Line,
} from "@remixicon/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const mainNavItems = [
  {
    title: "Projects",
    href: "/dashboard",
    icon: RiLayoutGridLine,
  },
  {
    title: "Activity Logs",
    href: "/activity",
    icon: RiFileList3Line,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: RiBarChartBoxLine,
  },
];

const configNavItems = [
  {
    title: "Custom Domains",
    href: "/domains",
    icon: RiEarthLine,
  },
  {
    title: "API Keys",
    href: "/keys",
    icon: RiKey2Line,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: RiSettings3Line,
  },
];

export function RootSidebar({
  workspaceName,
}: {
  /** Configured workspace name (Settings → Workspace Name). */
  workspaceName: string;
}): React.JSX.Element {
  const pathname = usePathname();
  const { user } = useSafeUser();
  const workspaceInitial = workspaceName.trim().slice(0, 1).toUpperCase();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="flex flex-col gap-4 px-2 pt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <div className="bg-primary/20 text-primary flex aspect-square size-8 items-center justify-center rounded-lg">
                  <span className="text-sm font-bold">
                    {workspaceInitial || "W"}
                  </span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-semibold sm:text-base">
                    {workspaceName}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    Self-hosted
                  </span>
                </div>
                <RiArrowUpDownLine className="ml-auto h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div
            role="button"
            tabIndex={0}
            aria-label="Open command menu"
            aria-keyshortcuts="Control+K Meta+K"
            className="focus-visible:ring-ring focus-visible:ring-offset-background group relative cursor-pointer rounded-md px-2 group-data-[collapsible=icon]:hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-command-menu"))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent("open-command-menu"));
              }
            }}
          >
            <RiSearchLine
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
            />
            <input
              type="text"
              tabIndex={-1}
              aria-hidden="true"
              readOnly
              placeholder="Find"
              className="border-border/50 bg-background text-foreground placeholder:text-muted-foreground group-hover:border-border pointer-events-none h-11 w-full cursor-pointer rounded-md border py-1 pr-10 pl-9 text-sm transition-colors md:h-9"
            />
            <div className="border-border/50 bg-muted/50 text-muted-foreground pointer-events-none absolute top-1/2 right-3 flex h-5 items-center justify-center rounded-sm border px-1.5 font-mono text-[10px] font-medium">
              ⌘K
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="flex flex-col gap-2 pt-3">
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent className="mt-1">
              <SidebarMenu>
                {mainNavItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (pathname.startsWith(item.href) && item.href !== "/");
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={
                          <Link href={item.href} aria-label={item.title} />
                        }
                        className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary hover:bg-muted/50 transition-colors duration-200 data-[active=true]:font-medium max-md:h-11"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="px-4">
            <SidebarSeparator />
          </div>

          <SidebarGroup>
            <SidebarGroupLabel>Configure</SidebarGroupLabel>
            <SidebarGroupContent className="mt-1">
              <SidebarMenu>
                {configNavItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={
                          <Link href={item.href} aria-label={item.title} />
                        }
                        className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary hover:bg-muted/50 transition-colors duration-200 data-[active=true]:font-medium max-md:h-11"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="border-border/50 flex w-full min-w-0 items-center justify-between border-t p-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
          <ProfileDialog>
            <button className="hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background -ml-1 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md p-1 text-left transition-colors group-data-[collapsible=icon]:ml-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
              {user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-7 sm:w-7"
                />
              ) : (
                <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-7 sm:w-7">
                  {user?.firstName?.charAt(0) || "U"}
                </div>
              )}
              <span className="flex-1 truncate text-sm font-medium tracking-wide uppercase group-data-[collapsible=icon]:hidden">
                {user?.fullName || "User"}
              </span>
            </button>
          </ProfileDialog>
          <div className="text-muted-foreground flex shrink-0 items-center gap-1 group-data-[collapsible=icon]:hidden">
            <button
              type="button"
              aria-label="More profile actions"
              className="hover:bg-muted hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex h-11 w-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:h-8 md:w-8"
            >
              <RiMoreFill aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="hover:bg-muted hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background relative flex h-11 w-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:h-8 md:w-8"
            >
              <RiNotification3Line aria-hidden="true" className="h-4 w-4" />
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5"
              >
                <span className="bg-primary/60 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none"></span>
                <span className="bg-primary relative inline-flex h-1.5 w-1.5 rounded-full"></span>
              </span>
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
