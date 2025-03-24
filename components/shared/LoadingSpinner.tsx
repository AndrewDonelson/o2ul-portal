// file: /components/shared/LoadingSpinner.tsx
// feature: UI - Loading spinner with states
"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
 fullScreen?: boolean;
 size?: "sm" | "md" | "lg";
 label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
 fullScreen = false,
 size = "md",
 label = "Loading..."
}) => {
 return (
   <div className={cn(
     "flex flex-col items-center justify-center gap-4",
     fullScreen && "fixed inset-0 bg-background/80 backdrop-blur-sm"
   )}>
     <div className={cn(
       "animate-spin rounded-full border-t-2 border-primary",
       size === "sm" && "h-4 w-4 border",
       size === "md" && "h-8 w-8 border-2",
       size === "lg" && "h-12 w-12 border-4"
     )} />
     {label && (
       <p className="text-sm text-muted-foreground animate-pulse">
         {label}
       </p>
     )}
   </div>
 );
};