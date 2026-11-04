import * as React from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";

/**
 * Ensures Clerk is mounted during OAuth callback completion.
 */
export default function SsoCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}
