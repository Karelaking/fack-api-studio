"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  MoonIcon,
  SunIcon,
  LaptopIcon,
  HomeIcon,
  FolderIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { useTheme } from "@/components/ThemeProvider";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const openMenu = () => setOpen(true);

    document.addEventListener("keydown", down);
    window.addEventListener("open-command-menu", openMenu);

    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-menu", openMenu);
    };
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Menu"
      description="Quick search and actions platform palette"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard"))}
          >
            <PikaIcon icon={HomeIcon} className="mr-2 size-4" />
            <span>Go to Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard"))}
          >
            <PikaIcon icon={FolderIcon} className="mr-2 size-4" />
            <span>Browse Projects</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                window.dispatchEvent(
                  new CustomEvent("open-new-project-dialog"),
                );
              })
            }
          >
            <PikaIcon icon={PlusIcon} className="mr-2 size-4" />
            <span>Create New Project</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <PikaIcon icon={SunIcon} className="mr-2 size-4" />
            <span>Light Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <PikaIcon icon={MoonIcon} className="mr-2 size-4" />
            <span>Dark Theme</span>
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <PikaIcon icon={LaptopIcon} className="mr-2 size-4" />
            <span>System Theme (Auto)</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
