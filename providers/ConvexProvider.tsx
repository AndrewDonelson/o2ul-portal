"use client";

// file: /providers/ConvexProvider.tsx
// feature: Providers - Enhanced Convex client provider with connection monitoring

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";

interface ConvexProviderProps {
  children: ReactNode;
}

// Initialize outside of component to maintain single instance
// const convex = new ConvexReactClient(
//   process.env.CUSTOM_CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!, 
//   {
//     verbose: process.env.NODE_ENV === 'development',
//   }
// );
const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!, 
  {
    verbose: process.env.NODE_ENV === 'development',
  }
);

// Connection monitor component
function ConnectionMonitor() {
  const { isLoading } = useConvexAuth();
  const [hasReconnected, setHasReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      if (hasReconnected) {
        toast({
          title: "Connection restored",
          description: "You're back online. All features are now available.",
          duration: 3000,
        });
      }
      setHasReconnected(true);
    };

    const handleOffline = () => {
      toast({
        title: "Connection lost",
        description: "You're offline. Some features may be unavailable.",
        variant: "destructive",
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [hasReconnected]);

  return null; // Monitoring component doesn't render anything
}

export function ConvexProvider({ children }: ConvexProviderProps) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      <ConnectionMonitor />
      {children}
    </ConvexAuthNextjsProvider>
  );
}