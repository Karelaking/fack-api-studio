import type { Metadata } from "next";
import { SsoCallbackClient } from "@/components/auth/SsoCallbackClient";

export const metadata: Metadata = {
  title: "Authenticating · Fack API's",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Intermediate OAuth callback route for Clerk authentication.
 */
export default function SsoCallbackPage(): React.JSX.Element {
  return <SsoCallbackClient />;
}
