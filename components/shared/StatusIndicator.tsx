// file: /components/shared/StatusIndicator.tsx
// feature: Framework - Status dot/badge component

import { calculateStatus, StatusType } from "@/convex/presence";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";


type Size = 'sm' | 'md' | 'lg';

interface StatusIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  status?: StatusType;
  lastSeen?: number;
  size?: Size;
  align?: 'left' | 'center' | 'right';
  showLabel?: boolean;
  pulseAnimation?: boolean;
  customLabel?: string;
}

export function StatusIndicator({
  status: providedStatus,
  lastSeen,
  size = 'md',
  align = 'center',
  showLabel = false,
  pulseAnimation = true,
  customLabel,
  className,
  ...props
}: StatusIndicatorProps) {
  // Calculate status dynamically if not provided
  const status = calculateStatus(lastSeen);

  // Status configurations
  const statusConfig: Record<StatusType, { color: string; label: string }> = {
    online: { color: 'bg-green-500', label: 'Online' },
    offline: { color: 'bg-gray-400', label: 'Offline' },
    away: { color: 'bg-yellow-500', label: 'Away' },
  };

  // Size configurations
  const sizeConfig: Record<Size, { dot: string; text: string }> = {
    sm: { dot: 'h-2 w-2', text: 'text-xs' },
    md: { dot: 'h-3 w-3', text: 'text-sm' },
    lg: { dot: 'h-4 w-4', text: 'text-base' }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        {
          'justify-start': align === 'left',
          'justify-center': align === 'center',
          'justify-end': align === 'right'
        },
        className
      )}
      {...props}
    >
      <span className="relative inline-flex">
        <span
          className={cn(
            "rounded-full",
            sizeConfig[size].dot,
            statusConfig[status].color
          )}
        />
        {pulseAnimation && status === 'online' && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              statusConfig[status].color
            )}
          />
        )}
      </span>
      {showLabel && (
        <span
          className={cn(
            "font-medium text-muted-foreground",
            sizeConfig[size].text
          )}
        >
          {customLabel || statusConfig[status].label}
        </span>
      )}
    </div>
  );
}