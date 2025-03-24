// file: /providers/ErrorBoundaryProvider.tsx
// feature: Providers - Production-ready error boundary with logging

"use client";

import { ReactNode, useCallback } from "react";
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from "react-error-boundary";
import type { ErrorInfo } from "react";

interface ErrorBoundaryProviderProps {
  children: ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="text-center max-w-md p-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The application encountered an unexpected error. Our team has been notified.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function ErrorBoundaryProvider({ children }: ErrorBoundaryProviderProps) {
  const logError = useCallback((error: Error, info: ErrorInfo) => {
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example implementation - replace with your actual error logging
      console.error('Caught error:', error);
      console.error('Component stack:', info.componentStack);
      
      // If you have an error monitoring service like Sentry:
      // captureException(error, { extra: { componentStack: info.componentStack } });
    } else {
      console.error('Error caught by boundary:', error);
      console.error('Component stack:', info.componentStack);
    }
  }, []);

  return (
    <ReactErrorBoundary 
      FallbackComponent={ErrorFallback}
      onError={logError}
      onReset={() => {
        // Reset app state or perform cleanup if necessary
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}