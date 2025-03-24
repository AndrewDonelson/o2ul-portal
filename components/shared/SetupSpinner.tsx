// file: /components/shared/SetupSpinner.tsx
// feature: UI - Setup spinner with progress and current task
"use client";

import { cn } from "@/lib/utils";

interface SetupSpinnerProps {
  progress: number;
  currentTask: string;
}

export function SetupSpinner({ progress, currentTask }: SetupSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 fixed inset-0 bg-background/80 backdrop-blur-sm">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-spin rounded-full border-t-4 border-primary" />
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">
          {progress}%
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{currentTask}</p>
    </div>
  );
}