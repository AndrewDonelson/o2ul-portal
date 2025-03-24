// file: /components/shared/AlertBanner.tsx
// feature: Framework - Notification banner component

import { cn } from "@/lib/utils";
import { HTMLAttributes, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X } from "lucide-react";

type AlertType = 'info' | 'success' | 'warning' | 'error';
type Position = 'top' | 'bottom';

interface AlertBannerProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  type?: AlertType;
  align?: 'left' | 'center' | 'right';
  position?: Position;
  dismissible?: boolean;
  autoHideDuration?: number | null;
}

export function AlertBanner({
  title,
  message,
  type = 'info',
  align = 'center',
  position = 'top',
  dismissible = true,
  autoHideDuration = null,
  className,
  ...props
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Handle auto-hide
  if (autoHideDuration !== null && isVisible) {
    setTimeout(() => setIsVisible(false), autoHideDuration);
  }

  if (!isVisible) return null;

  // Alert variants based on type
  const variants = {
    info: "",
    success: "bg-green-500/15 text-green-700 dark:text-green-400",
    warning: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
    error: "bg-red-500/15 text-red-700 dark:text-red-400"
  };

  // Animation based on position
  const animations = {
    top: "animate-slide-in-from-top",
    bottom: "animate-slide-in-from-bottom"
  };

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-50 px-4 py-2",
        position === 'top' ? 'top-0' : 'bottom-0',
        animations[position],
        className
      )}
      {...props}
    >
      <Alert
        className={cn(
          "mx-auto max-w-screen-lg shadow-lg",
          variants[type],
          {
            'text-left': align === 'left',
            'text-center': align === 'center',
            'text-right': align === 'right'
          }
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            {title && (
              <AlertTitle className="mb-1 font-semibold">
                {title}
              </AlertTitle>
            )}
            <AlertDescription className="text-sm">
              {message}
            </AlertDescription>
          </div>
          {dismissible && (
            <button
              onClick={() => setIsVisible(false)}
              className="text-current opacity-70 transition-opacity hover:opacity-100"
              aria-label="Dismiss alert"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </Alert>
    </div>
  );
}