// file: /components/shared/ErrorBoundary.tsx
// feature: Framework - Error boundary wrapper component

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    const { align = 'center', fallback, children } = this.props;

    if (this.state.hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className={cn(
          "p-6 animate-fade-in",
          {
            'text-left': align === 'left',
            'text-center': align === 'center',
            'text-right': align === 'right'
          }
        )}>
          <Alert variant="destructive" className="mb-4">
            <AlertTitle className="mb-2">Something went wrong</AlertTitle>
            <AlertDescription className="text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </AlertDescription>
          </Alert>

          <div className={cn(
            "mt-4 flex gap-4",
            {
              'justify-start': align === 'left',
              'justify-center': align === 'center',
              'justify-end': align === 'right'
            }
          )}>
            <Button
              variant="outline"
              onClick={this.handleReset}
              className="animate-fade-in-up delay-100"
            >
              Try Again
            </Button>
            <Button
              variant="default"
              onClick={() => window.location.reload()}
              className="animate-fade-in-up delay-200"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}