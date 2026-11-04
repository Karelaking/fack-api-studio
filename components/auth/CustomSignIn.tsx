"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn } from "@clerk/nextjs";
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
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

type SignInView =
  | "credentials"
  | "forgot-password-email"
  | "forgot-password-code"
  | "mfa";

/**
 * Custom Sign-In Component tailored for Fack API Studio's design system.
 * Replaces Clerk's generic prebuilt components with native shadcn primitives,
 * full dark/light theme support, MFA and password recovery flows.
 */
export const CustomSignIn = (): React.JSX.Element => {
  const { loaded } = useClerk();
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();

  const isClerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  const [view, setView] = useState<SignInView>("credentials");
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [mfaCode, setMfaCode] = useState<string>("");
  const [resetCode, setResetCode] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = isSubmitting || fetchStatus === "fetching";

  // Fallback UI if running without Clerk keys configured
  if (!isClerkConfigured) {
    return (
      <Card className="border-border/80 bg-card/95 ring-border/50 w-full max-w-md shadow-xl ring-1">
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle className="font-heading text-xl font-bold">
            Studio Authentication
          </CardTitle>
          <CardDescription>
            Authentication keys are not configured in this environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            To enable user accounts and device approval flows, set{" "}
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
    await signIn.finalize({
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

  const handleCredentialsSignIn = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!loaded || !signIn) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signIn.password({
        identifier: identifier.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (signIn.status === "complete") {
        await navigateAfterAuth();
      } else if (
        signIn.status === "needs_second_factor" ||
        signIn.status === "needs_client_trust"
      ) {
        setView("mfa");
      } else if (signIn.status === "needs_first_factor") {
        setErrorMessage(
          "Additional verification is required for this account.",
        );
      } else {
        setErrorMessage(`Sign-in status: ${signIn.status}`);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during sign-in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetCode = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!loaded || !signIn) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error: createError } = await signIn.create({
        identifier: identifier.trim(),
      });

      if (createError) {
        setErrorMessage(createError.message);
        return;
      }

      const { error: sendError } =
        await signIn.resetPasswordEmailCode.sendCode();

      if (sendError) {
        setErrorMessage(sendError.message);
        return;
      }

      setView("forgot-password-code");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to send password reset code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!loaded || !signIn) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error: verifyError } =
        await signIn.resetPasswordEmailCode.verifyCode({
          code: resetCode.trim(),
        });

      if (verifyError) {
        setErrorMessage(verifyError.message);
        return;
      }

      const { error: submitError } =
        await signIn.resetPasswordEmailCode.submitPassword({
          password: newPassword,
        });

      if (submitError) {
        setErrorMessage(submitError.message);
        return;
      }

      if (signIn.status === "complete") {
        await navigateAfterAuth();
      } else {
        setView("credentials");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to reset password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaVerification = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!loaded || !signIn) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signIn.mfa.verifyTOTP({
        code: mfaCode.trim(),
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (signIn.status === "complete") {
        await navigateAfterAuth();
      } else {
        setErrorMessage("MFA verification incomplete.");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to verify two-factor authentication code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/80 bg-card/95 ring-border/50 w-full max-w-md shadow-xl ring-1">
      {/* View 1: Standard Credentials Sign In */}
      {view === "credentials" && (
        <>
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="font-heading text-foreground text-2xl font-bold tracking-tight">
              Welcome back
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Enter your credentials to access your Fack Studio workspace.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <SocialAuthButtons
              mode="sign-in"
              onError={(err): void => setErrorMessage(err)}
            />

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-border absolute inset-0 flex items-center">
                <span className="border-border w-full border-t" />
              </div>
              <span className="bg-card text-muted-foreground relative px-3 text-xs tracking-wider uppercase select-none">
                Or continue with email
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

            <form onSubmit={handleCredentialsSignIn} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="sign-in-email"
                  className="text-foreground text-xs font-semibold"
                >
                  Email address
                </Label>
                <div className="relative">
                  <Input
                    id="sign-in-email"
                    type="email"
                    placeholder="ada@example.com"
                    autoComplete="email"
                    required
                    value={identifier}
                    onChange={(e): void => setIdentifier(e.target.value)}
                    disabled={isBusy || !loaded}
                    className="bg-background/50 border-input text-foreground focus-visible:ring-primary h-10"
                  />
                  <Mail className="text-muted-foreground/50 pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="sign-in-password"
                    className="text-foreground text-xs font-semibold"
                  >
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={(): void => {
                      setErrorMessage(null);
                      setView("forgot-password-email");
                    }}
                    className="text-primary hover:text-primary-hover text-xs font-medium transition-colors hover:underline focus-visible:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="sign-in-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
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
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-border/50 border-t pt-4 pb-4">
            <p className="text-muted-foreground mx-auto text-xs">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-primary hover:text-primary-hover font-semibold transition-colors hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </>
      )}

      {/* View 2: Forgot Password - Request Code */}
      {view === "forgot-password-email" && (
        <>
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="font-heading text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
              <KeyRound className="text-primary size-5" aria-hidden="true" />
              Reset your password
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Enter your email address and we&apos;ll send you a 6-digit
              verification code.
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

            <form onSubmit={handleSendResetCode} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="reset-email"
                  className="text-foreground text-xs font-semibold"
                >
                  Email address
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="ada@example.com"
                  required
                  value={identifier}
                  onChange={(e): void => setIdentifier(e.target.value)}
                  disabled={isBusy}
                  className="bg-background/50 border-input text-foreground focus-visible:ring-primary h-10"
                />
              </div>

              <Button
                type="submit"
                disabled={isBusy}
                className="bg-primary text-primary-foreground hover:bg-primary-hover h-10 w-full font-semibold transition-all"
              >
                {isBusy ? (
                  <>
                    <Loader2
                      className="mr-2 size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Sending code...
                  </>
                ) : (
                  "Send reset code"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-border/50 border-t pt-4 pb-4">
            <button
              type="button"
              onClick={(): void => {
                setErrorMessage(null);
                setView("credentials");
              }}
              className="text-muted-foreground hover:text-foreground mx-auto text-xs font-medium transition-colors hover:underline"
            >
              Return to sign in
            </button>
          </CardFooter>
        </>
      )}

      {/* View 3: Forgot Password - Enter Code and New Password */}
      {view === "forgot-password-code" && (
        <>
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="font-heading text-foreground text-xl font-bold tracking-tight">
              Create new password
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Enter the code sent to{" "}
              <span className="text-foreground font-medium">{identifier}</span>{" "}
              and choose a new password.
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

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="reset-code"
                  className="text-foreground text-xs font-semibold"
                >
                  6-Digit Verification Code
                </Label>
                <Input
                  id="reset-code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  required
                  value={resetCode}
                  onChange={(e): void => setResetCode(e.target.value)}
                  disabled={isBusy}
                  className="bg-background/50 border-input text-foreground focus-visible:ring-primary h-10 text-center font-mono text-base tracking-widest"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="new-password"
                  className="text-foreground text-xs font-semibold"
                >
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={newPassword}
                    onChange={(e): void => setNewPassword(e.target.value)}
                    disabled={isBusy}
                    className="bg-background/50 border-input text-foreground focus-visible:ring-primary h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={(): void => setShowNewPassword((prev) => !prev)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 p-1 transition-colors"
                    aria-label={
                      showNewPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isBusy}
                className="bg-primary text-primary-foreground hover:bg-primary-hover h-10 w-full font-semibold transition-all"
              >
                {isBusy ? (
                  <>
                    <Loader2
                      className="mr-2 size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Updating password...
                  </>
                ) : (
                  "Reset password and sign in"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-border/50 border-t pt-4 pb-4">
            <button
              type="button"
              onClick={(): void => {
                setErrorMessage(null);
                setView("credentials");
              }}
              className="text-muted-foreground hover:text-foreground mx-auto text-xs font-medium transition-colors hover:underline"
            >
              Cancel
            </button>
          </CardFooter>
        </>
      )}

      {/* View 4: MFA Verification */}
      {view === "mfa" && (
        <>
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="font-heading text-foreground text-xl font-bold tracking-tight">
              Two-Factor Authentication
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Enter the 6-digit code generated by your authenticator app.
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

            <form onSubmit={handleMfaVerification} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="mfa-code"
                  className="text-foreground text-xs font-semibold"
                >
                  Authenticator Code
                </Label>
                <Input
                  id="mfa-code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e): void => setMfaCode(e.target.value)}
                  disabled={isBusy}
                  className="bg-background/50 border-input text-foreground focus-visible:ring-primary h-10 text-center font-mono text-base tracking-widest"
                />
              </div>

              <Button
                type="submit"
                disabled={isBusy}
                className="bg-primary text-primary-foreground hover:bg-primary-hover h-10 w-full font-semibold transition-all"
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
                  "Verify & Continue"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-border/50 border-t pt-4 pb-4">
            <button
              type="button"
              onClick={(): void => {
                setErrorMessage(null);
                setView("credentials");
              }}
              className="text-muted-foreground hover:text-foreground mx-auto text-xs font-medium transition-colors hover:underline"
            >
              Return to sign in
            </button>
          </CardFooter>
        </>
      )}
    </Card>
  );
};
