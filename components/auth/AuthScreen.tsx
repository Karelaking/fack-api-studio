"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { CustomSignIn } from "@/components/auth/CustomSignIn";
import { CustomSignUp } from "@/components/auth/CustomSignUp";
import { AuthShowcase } from "@/components/auth/AuthShowcase";

export type AuthMode = "sign-in" | "sign-up";

export type AuthScreenProps = {
  mode: AuthMode;
};

/**
 * Split-screen authentication shell shared by the sign-in and sign-up routes.
 * The left showcase adapts its presentation, workflow previews, and metrics
 * dynamically based on the current authentication mode and active theme.
 */
export const AuthScreen = ({ mode }: AuthScreenProps): React.JSX.Element => {
  return (
    <div className="bg-background flex min-h-svh flex-col lg:grid lg:grid-cols-[1.1fr_1fr]">
      <AuthShowcase mode={mode} />

      <div className="relative flex min-h-svh flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 lg:hidden"
            aria-label="Fack API's — home"
          >
            <BrandLogo size={26} />
            <span className="text-sm font-extrabold tracking-tight">
              fackapi<span className="text-primary">.</span>studio
            </span>
          </Link>

          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 text-sm transition-colors lg:inline-flex"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>

          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          {mode === "sign-in" ? <CustomSignIn /> : <CustomSignUp />}
        </main>

        <footer className="px-5 pb-8 sm:px-8">
          <p className="text-muted-foreground text-caption mx-auto max-w-sm text-center leading-relaxed">
            Self-hosted, open source and MIT licensed.
          </p>
        </footer>
      </div>
    </div>
  );
};
