"use client";

// file: /providers/SuspenseProvider.tsx
// feature: Providers - Suspense boundary with loading UI

import { ReactNode, Suspense } from "react";
import { Loader2 } from "lucide-react";

interface SuspenseProviderProps {
  children: ReactNode;
}

function LoadingFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export function SuspenseProvider({ children }: SuspenseProviderProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  );
}