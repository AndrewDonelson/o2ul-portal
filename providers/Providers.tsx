"use client";
// file: /providers/Providers.tsx
// feature: Providers - Main provider wrapper component with memoization

import { ReactNode, memo } from "react";
import { ConvexProvider } from "./ConvexProvider";
import { AuthProvider } from "./AuthProvider";
import { ErrorBoundaryProvider } from "./ErrorBoundaryProvider";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import { ThemeProvider } from "./ThemeProvider";
import { SuspenseProvider } from "./SuspenseProvider";
import { ToasterProvider } from "./ToasterProvider";
import { FullscreenProvider } from "@/context/fullscreen/FullscreenContext";
import { NotificationProvider } from "@/context/notifications/NotificationContext";
import { AdminAuthProvider } from "./AdminAuthProvider";
import PathTracker from "@/components/pwa/PathTracker";
import PWAInitializer from "@/components/pwa/PWAInitializer";

// Props interface for Providers component
interface ProvidersProps {
  children: ReactNode;
}

// Memoized providers to prevent unnecessary re-renders
const MemoizedErrorBoundary = memo(ErrorBoundaryProvider);
const MemoizedThemeProvider = memo(ThemeProvider);
const MemoizedSuspenseProvider = memo(SuspenseProvider);
const MemoizedToasterProvider = memo(ToasterProvider);
const MemoizedNotificationProvider = memo(NotificationProvider);
const MemoizedAdminAuthProvider = memo(AdminAuthProvider);

/**
 * Root provider component that wraps the entire application
 * with necessary context providers and initializers
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <MemoizedErrorBoundary>
      <ConvexProvider>
        <AuthProvider>
          <MemoizedAdminAuthProvider>
            <PreferencesProvider>
              <MemoizedThemeProvider>
                <MemoizedSuspenseProvider>
                  <MemoizedToasterProvider>
                    <MemoizedNotificationProvider>
                        <FullscreenProvider>
                          {/* Initialize PWA features */}
                          <PWAInitializer enableServiceWorker={true} />
                          
                          {/* Track user paths for better offline experience */}
                          <PathTracker />                      
                          {children}
                        </FullscreenProvider>
                    </MemoizedNotificationProvider>
                  </MemoizedToasterProvider>
                </MemoizedSuspenseProvider>
              </MemoizedThemeProvider>
            </PreferencesProvider>
          </MemoizedAdminAuthProvider>
        </AuthProvider>
      </ConvexProvider>
    </MemoizedErrorBoundary>
  );
}