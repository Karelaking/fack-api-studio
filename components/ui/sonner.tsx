"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { PikaIcon } from "@pikaicons/react";
import {
  AlertTriangleIcon,
  CheckTickCircleIcon,
  InformationCircleIcon,
  MultipleCrossCancelCircleIcon,
  RefreshIcon,
} from "@pikaicons/core-free";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <PikaIcon icon={CheckTickCircleIcon} className="size-4" />,
        info: <PikaIcon icon={InformationCircleIcon} className="size-4" />,
        warning: <PikaIcon icon={AlertTriangleIcon} className="size-4" />,
        error: (
          <PikaIcon icon={MultipleCrossCancelCircleIcon} className="size-4" />
        ),
        loading: (
          <PikaIcon icon={RefreshIcon} className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
