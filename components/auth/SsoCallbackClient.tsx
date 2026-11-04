"use client";

import React from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

/**
 * Handles completion of third-party OAuth callbacks (GitHub, Google).
 * Displays a branded loading state while the Clerk handshake finalizes.
 */
export const SsoCallbackClient = (): React.JSX.Element => {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <BrandLogo size={42} />
        <div className="space-y-2">
          <h1 className="font-heading text-foreground text-lg font-bold tracking-tight">
            Authenticating with Fack Studio
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Completing secure authentication handshake, please wait...
          </p>
        </div>
        <Loader2
          className="text-primary mt-2 size-6 animate-spin"
          aria-hidden="true"
        />
      </div>

      {/* Hidden Clerk handler that reads URL parameters and redirects */}
      <div className="sr-only" aria-hidden="true">
        <AuthenticateWithRedirectCallback
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
};
