// file: /components/providers/AuthProvider.tsx
// feature: Auth - Profile sync and management with reduced re-renders

import { useConvexAuth } from "convex/react";
import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { debug } from "@/lib/utils";

export function useAuthStateHandler() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const syncProfile = useMutation(api.auth.syncProfile);
  const previousAuthState = useRef<boolean | null>(null);

  useEffect(() => {
    // Only sync when auth state actually changes, not on every render
    if (!isLoading && previousAuthState.current !== isAuthenticated) {
      const handleAuthChange = async () => {
        try {
          if (isAuthenticated) {
            await syncProfile({ action: "signIn" });
          } else if (previousAuthState.current === true) {
            // Only trigger signOut if previously signed in
            await syncProfile({ action: "signOut" });
          }
        } catch (error) {
          debug("Auth", "Error syncing profile", error);
        }
      };

      handleAuthChange();
      previousAuthState.current = isAuthenticated;
    }
  }, [isAuthenticated, isLoading, syncProfile]);

  return { isAuthenticated, isLoading };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthStateHandler();
  return <>{children}</>;
}