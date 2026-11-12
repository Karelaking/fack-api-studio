"use client";

import React, { useState } from "react";
import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { GithubSolidIcon, GoogleIcon, RefreshIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { Button } from "@/components/ui/button";

export interface SocialAuthButtonsProps {
  mode: "sign-in" | "sign-up";
  onError: (errorMessage: string) => void;
}

/**
 * Reusable OAuth authentication buttons for GitHub and Google.
 * Initiates the Clerk redirect flow to /sso-callback and returns to /dashboard.
 */
export const SocialAuthButtons = ({
  mode,
  onError,
}: SocialAuthButtonsProps): React.JSX.Element => {
  const { loaded } = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [loadingProvider, setLoadingProvider] = useState<
    "github" | "google" | null
  >(null);

  const handleOAuth = async (provider: "github" | "google"): Promise<void> => {
    if (!loaded) {
      return;
    }

    const strategy = provider === "github" ? "oauth_github" : "oauth_google";
    setLoadingProvider(provider);

    try {
      if (mode === "sign-in") {
        const { error } = await signIn.sso({
          strategy,
          redirectUrl: "/dashboard",
          redirectCallbackUrl: "/sso-callback",
        });
        if (error) {
          setLoadingProvider(null);
          onError(error.message);
        }
      } else {
        const { error } = await signUp.sso({
          strategy,
          redirectUrl: "/dashboard",
          redirectCallbackUrl: "/sso-callback",
        });
        if (error) {
          setLoadingProvider(null);
          onError(error.message);
        }
      }
    } catch (err) {
      setLoadingProvider(null);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to connect to the authentication provider.";
      onError(message);
    }
  };

  return (
    <div className="grid w-full grid-cols-2 gap-3">
      <Button
        type="button"
        variant="outline"
        size="default"
        disabled={!loaded || loadingProvider !== null}
        onClick={(): Promise<void> => handleOAuth("github")}
        className="border-border/80 bg-background/60 hover:bg-muted text-foreground h-10 w-full justify-center gap-2 font-medium shadow-xs transition-all"
        aria-label={`${mode === "sign-in" ? "Sign in" : "Sign up"} with GitHub`}
      >
        {loadingProvider === "github" ? (
          <PikaIcon
            icon={RefreshIcon}
            className="size-4 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <PikaIcon
            icon={GithubSolidIcon}
            className="size-4 shrink-0"
            aria-hidden="true"
          />
        )}
        <span>GitHub</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="default"
        disabled={!loaded || loadingProvider !== null}
        onClick={(): Promise<void> => handleOAuth("google")}
        className="border-border/80 bg-background/60 hover:bg-muted text-foreground h-10 w-full justify-center gap-2 font-medium shadow-xs transition-all"
        aria-label={`${mode === "sign-in" ? "Sign in" : "Sign up"} with Google`}
      >
        {loadingProvider === "google" ? (
          <PikaIcon
            icon={RefreshIcon}
            className="size-4 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <PikaIcon
            icon={GoogleIcon}
            className="size-4 shrink-0 text-red-500"
            aria-hidden="true"
          />
        )}
        <span>Google</span>
      </Button>
    </div>
  );
};
