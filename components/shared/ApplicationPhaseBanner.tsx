// file: /components/shared/ApplicationPhaseBanner.tsx
// feature: UI - Application phase banner for non-production environments

"use client";

import { useState } from "react";
import React from "react";
import { APP_PHASE, APP_VERSION } from "@/lib/constants";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Bug, 
  Rocket, 
  CheckCircle2, 
  Shield, 
  Info 
} from "lucide-react";
import { cn } from "@/lib/utils";

const phaseConfig = {
  alpha: {
    color: "bg-orange-500",
    icon: Bug
  },
  beta: {
    color: "bg-yellow-500",
    icon: Rocket
  },
  qa: {
    color: "bg-blue-500",
    icon: CheckCircle2
  },
  prod: {
    color: "bg-green-500",
    icon: Shield
  }
};

const phaseDescriptions = {
  alpha: "Alpha phase means this application is in early testing. Features may be incomplete or unstable, and significant changes are expected. Use with caution as data may not be preserved between updates.",
  beta: "Beta phase means this application is feature complete but still undergoing testing. While more stable than Alpha, bugs may still occur and some features might change before the final release.",
  qa: "QA phase means this application is in quality assurance testing. The app is feature complete and stable, but undergoing final verification before production release.",
  prod: "Production phase means this application is fully released and supported for general use."
};

interface ApplicationPhaseBannerProps {
  className?: string;
}

export default function ApplicationPhaseBanner({ className }: ApplicationPhaseBannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Only show banner for alpha and beta phases
  if (APP_PHASE === "prod") {
    return null;
  }
  
  return (
    <>
      <div 
        className={cn(
          "w-full flex items-center justify-center py-1 px-4 text-sm font-medium cursor-pointer",
          phaseConfig[APP_PHASE].color,
          "text-white",
          className
        )}
        onClick={() => setDialogOpen(true)}
      >
        {React.createElement(phaseConfig[APP_PHASE].icon, { className: "w-4 h-4 mr-2" })}
        <span>
          <i>Application is in <strong>{APP_PHASE.toUpperCase()}</strong> phase</i> - Learn more
        </span>
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span 
                className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded-full",
                  phaseConfig[APP_PHASE].color
                )}
              >
                {React.createElement(phaseConfig[APP_PHASE].icon, { className: "w-4 h-4 text-white" })}
              </span>
              Application Phase: {APP_PHASE.toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              {phaseDescriptions[APP_PHASE]}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Large animated icon */}
            <div className="flex justify-center my-4">
              <div className={cn(
                "relative p-6 rounded-full",
                phaseConfig[APP_PHASE].color,
                "bg-opacity-20 dark:bg-opacity-20"
              )}>
                <div className="absolute inset-0 rounded-full bg-background/20 animate-pulse"></div>
                {React.createElement(phaseConfig[APP_PHASE].icon, { 
                  className: cn(
                    "w-16 h-16 text-foreground relative z-10",
                    APP_PHASE === "alpha" && "animate-bounce", 
                    APP_PHASE === "beta" && "animate-pulse",
                    APP_PHASE === "qa" && "animate-ping-slow"
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">What this means:</h4>
              {APP_PHASE === "alpha" && (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Features are still under active development</li>
                  <li>You may encounter bugs or unexpected behavior</li>
                  <li>The application may change significantly</li>
                  <li>Data may be reset without notice</li>
                  <li>Limited support available</li>
                </ul>
              )}
              
              {APP_PHASE === "beta" && (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Core features are complete but still being refined</li>
                  <li>Bugs may still occur, but less frequently than in Alpha</li>
                  <li>Performance may not be optimized</li>
                  <li>Data should be preserved in most cases, but backups are recommended</li>
                  <li>Your feedback is valuable for improving the application</li>
                </ul>
              )}
              
              {APP_PHASE === "qa" && (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Feature development is frozen - no new features will be added</li>
                  <li>Focused on finding and fixing remaining issues</li>
                  <li>Performance optimization is underway</li>
                  <li>Data structure is stable - will be preserved in production</li>
                  <li>Help us verify all functions work as expected</li>
                </ul>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground border-t pt-2">
              <p className="italic">
                This information is intended for development and testing purposes.
                Version: {APP_VERSION || "Unknown"}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}