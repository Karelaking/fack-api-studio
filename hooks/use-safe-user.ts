"use client";

import { useUser, useClerk } from "@clerk/nextjs";

export interface SafeUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
  unsafeMetadata?: Record<string, unknown>;
  publicMetadata?: Record<string, unknown>;
  updateMetadata: (data: {
    unsafeMetadata?: Record<string, unknown>;
  }) => Promise<unknown>;
  update: (data: { firstName?: string; lastName?: string }) => Promise<unknown>;
}

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const LOCAL_FALLBACK_USER: SafeUser = {
  id: "system",
  firstName: "Local",
  lastName: "Developer",
  fullName: "Local Developer",
  imageUrl: null,
  primaryEmailAddress: { emailAddress: "local@localhost" },
  unsafeMetadata: {
    clubName: "Local Workspace",
    role: "Developer",
    website: "",
  },
  publicMetadata: {},
  updateMetadata: async () => {},
  update: async () => {},
};

function useLocalUser(): {
  user: SafeUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: (options?: { redirectUrl?: string }) => Promise<void>;
} {
  return {
    user: LOCAL_FALLBACK_USER,
    isLoaded: true,
    isSignedIn: true,
    signOut: async () => {},
  };
}

function useClerkUser(): {
  user: SafeUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: (options?: { redirectUrl?: string }) => Promise<void>;
} {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  return {
    user: (user as unknown as SafeUser) ?? null,
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    signOut: (options?: { redirectUrl?: string }) => signOut(options),
  };
}

/**
 * Hook for resolving user information safely in both local/Docker mode
 * (where Clerk is omitted) and cloud/SaaS mode (where Clerk is configured).
 */
export const useSafeUser = HAS_CLERK ? useClerkUser : useLocalUser;
