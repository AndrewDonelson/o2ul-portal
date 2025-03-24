"use client";

// file: /providers/ToasterProvider.tsx
// feature: Providers - Toast notification provider

import { Toaster } from "@/components/ui/toaster";
import { ReactNode } from "react";

interface ToasterProviderProps {
  children: ReactNode;
}

export function ToasterProvider({ children }: ToasterProviderProps) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}