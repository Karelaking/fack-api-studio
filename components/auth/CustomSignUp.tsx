"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useSignUp } from "@clerk/nextjs";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";

type SignUpView = "form" | "verify-email";

/**
 * Custom Sign-Up Component tailored for Fack API Studio's design system.
 * Replaces Clerk's generic prebuilt components with native shadcn primitives,
 * full dark/light theme support, and seamless email OTP verification.
 */
export const CustomSignUp = (): React.JSX.Element => {
  const { loaded } = useClerk();
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();

  const isClerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  const [view, setView] = useState<SignUpView>("form");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = isSubmitting || fetchStatus === "fetching";

  // Fallback UI if running without Clerk keys configured
  if (!isClerkConfigured) {
    return (
      <Card className="border-border/80 bg-card/95 ring-border/50 w-full max-w-md shadow-xl ring-1">
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle className="font-heading text-xl font-bold">
            Studio Registration
          </CardTitle>
          <CardDescription>
            Authentication keys are not configured in this environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            To enable user registration and cloud synchronization, set{" "}
            <code className="text-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </code>{" "}
            in your environment.
          </p>
          <Button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary-hover w-full font-semibold"
            onClick={(): void => router.push("/dashboard")}
          >
            Continue to Dashboard (Local Mode)
          </Button>
        </CardContent>
      </Card>
    );
  }

  const navigateAfterAuth = async (): Promise<void> => {
    await signUp.finalize({
      navigate: ({ decorateUrl }): void => {
        const destination = "/dashboard";
        const url = decorateUrl(destination);
        if (url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.push(url);
        }
      },
    });
  };

  const handleCreateAccount = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!loaded || !signUp) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signUp.password({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (signUp.status === "complete") {
        await navigateAfterAuth();
        return;
      }

      // Check if email verification is required
      const { error: sendCodeError } =
        await signUp.verifications.sendEmailCode();
      if (sendCodeError) {
        setErrorMessage(sendCodeError.message);
        return;
      }

      setView("verify-email");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during account creation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmail = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!loaded || !signUp) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signUp.verifications.verifyEmailCode({
        code: verificationCode.trim(),
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (signUp.status === "complete") {
        await navigateAfterAuth();
      } else {
        setErrorMessage("Verification could not be completed.");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to verify confirmation code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async (): Promise<void> => {
    if (!loaded || !signUp || isResending) {
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setResendSuccess(false);

    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setResendSuccess(true);
      setTimeout((): void => {
        setResendSuccess(false);
      }, 5000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to resend confirmation code.",
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="border-border/80 bg-card/95 ring-border/50 w-full max-w-md shadow-xl ring-1">
      {view === "form" && (
        <>
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="font-heading text-foreground text-2xl font-bold tracking-tight">
              Create your account
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Join Fack Studio to visually design, mock, and ship
              high-performance APIs.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <SocialAuthButtons
              mode="sign-up"
              onError={(err): void => setErrorMessage(err)}
            />

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-border absolute inset-0 flex items-center">
                <span className="border-border w-full border-t" />
              </div>
              <span className="bg-card text-muted-foreground relative px-3 text-xs tracking-wider uppercase select-none">
                Or register with email
              </span>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive animate-in fade-in flex items-start gap-2.5 rounded-lg border p-3 text-xs"
              >
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="sign-up-firstname"
                    className="text-foreground text-xs font-semibold"
                  >
                    First name
                  </Label>
                  <Input
                    id="sign-up-firstname"
                    type="text"
                    placeholder="Ada"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e): void => setFirstName(e.target.value)}
                    disabled={isBusy || !loaded}
                    className="bg-background/50 border-input text-foreground focus-visible:ring-primary h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="sign-up-lastname"
                    className="text-foreground text-xs font-semibold"
                  >
                    Last name
                  </Label>
                  <Input
                    id="sign-up-lastname"
                    type="text"
                    placeholder="Lovelace"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e): void => setLastName(e.target.value)}
                    disabled={isBusy || !loaded}
                    className="bg-background/50 border-input text-foreground focus-visible:ring-primary h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="sign-up-email"
                  className="text-foreground text-xs font-semibold"
                >
                  Email address
                </Label>
                <div className="relative">
                  <Input
                    id="sign-up-email"
                    type="email"
                    placeholder="ada@example.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e): void => setEmail(e.target.value)}
                    disabled={isBusy || !loaded}
                    className="bg-background/50 border-input text-foreground focus-visible:ring-primary h-10"
                  />
                  <Mail className="text-muted-foreground/50 pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="sign-up-password"
                  className="text-foreground text-xs font-semibold"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="sign-up-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e): void => setPassword(e.target.value)}
                    disabled={isBusy || !loaded}
                    className="bg-background/50 border-input text-foreground focus-visible:ring-primary h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={(): void => setShowPassword((prev) => !prev)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 p-1 transition-colors"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="text-muted-foreground text-caption leading-tight">
                  Must be at least 8 characters long.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isBusy || !loaded}
                className="bg-primary text-primary-foreground hover:bg-primary-hover h-10 w-full font-semibold shadow-xs transition-all"
              >
                {isBusy ? (
                  <>
                    <Loader2
                      className="mr-2 size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <p className="text-muted-foreground/80 text-caption text-center leading-relaxed">
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </CardContent>

          <CardFooter className="border-border/50 border-t pt-4 pb-4">
            <p className="text-muted-foreground mx-auto text-xs">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-primary hover:text-primary-hover font-semibold transition-colors hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </>
      )}

      {/* View 2: Email OTP Verification */}
      {view === "verify-email" && (
        <>
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="font-heading text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
              <ShieldCheck className="text-primary size-5" aria-hidden="true" />
              Verify your email
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              We sent a 6-digit confirmation code to{" "}
              <span className="text-foreground font-medium">{email}</span>.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive animate-in fade-in flex items-start gap-2.5 rounded-lg border p-3 text-xs"
              >
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {resendSuccess && (
              <output className="animate-in fade-in border-success/30 bg-success/10 text-success flex items-start gap-2.5 rounded-lg border p-3 text-xs">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">
                  A new verification code was sent to your inbox.
                </p>
              </output>
            )}

            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="verify-code"
                  className="text-foreground text-xs font-semibold"
                >
                  6-Digit Verification Code
                </Label>
                <Input
                  id="verify-code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(e): void => setVerificationCode(e.target.value)}
                  disabled={isBusy}
                  className="bg-background/50 border-input text-foreground focus-visible:ring-primary h-11 text-center font-mono text-lg tracking-widest"
                />
              </div>

              <Button
                type="submit"
                disabled={isBusy || verificationCode.trim().length === 0}
                className="bg-primary text-primary-foreground hover:bg-primary-hover h-10 w-full font-semibold shadow-xs transition-all"
              >
                {isBusy ? (
                  <>
                    <Loader2
                      className="mr-2 size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Verifying code...
                  </>
                ) : (
                  "Verify & Complete Registration"
                )}
              </Button>
            </form>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="text-primary hover:text-primary-hover text-xs font-medium transition-colors hover:underline disabled:opacity-50"
              >
                {isResending ? "Resending code..." : "Resend code"}
              </button>

              <button
                type="button"
                onClick={(): void => {
                  setErrorMessage(null);
                  setView("form");
                }}
                className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors hover:underline"
              >
                Change email
              </button>
            </div>
          </CardContent>

          <CardFooter className="border-border/50 border-t pt-4 pb-4">
            <Link
              href="/sign-in"
              className="text-muted-foreground hover:text-foreground mx-auto text-xs font-medium transition-colors hover:underline"
            >
              Back to sign in
            </Link>
          </CardFooter>
        </>
      )}
    </Card>
  );
};
