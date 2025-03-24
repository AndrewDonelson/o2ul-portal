"use client";

// file: /providers/ThemeProvider.tsx
// feature: Providers - Theme provider with system detection

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="foch-theme"
    >
      {children}
    </NextThemeProvider>
  );
}