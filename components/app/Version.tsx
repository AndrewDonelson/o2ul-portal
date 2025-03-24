"use client";
import React, { useState } from "react";
import { APP_PHASE, APP_VERSION } from "@/lib/constants";
import { useForceReload } from "@/app/hooks/useForceReload";
import { Badge } from "@/components/ui/badge";

const phaseBadgeColors = {
  alpha: "bg-orange-500 hover:bg-orange-600",
  beta: "bg-yellow-500 hover:bg-yellow-600",
  qa: "bg-blue-500 hover:bg-blue-600",
  prod: "bg-green-500 hover:bg-green-600"
};

const AppVersion: React.FC = () => {
  const forceReload = useForceReload();
  const [isUpdating, setIsUpdating] = useState(false);

  const clearCacheAndReload = async () => {
    setIsUpdating(true);
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      localStorage.clear();
      sessionStorage.clear();
      if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      }
      await forceReload();
    } catch (error) {
      console.error("Error clearing cache:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-gradient-to-r from-accent/10 to-primary/10 rounded-md hover:from-accent/20 hover:to-primary/20 transition-all duration-300 group cursor-pointer p-1"
         onClick={clearCacheAndReload}>
      <div className="relative w-5 h-16 mr-2">
        <Badge 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-90deg] whitespace-nowrap px-2 py-0.5 text-xs font-semibold ${phaseBadgeColors[APP_PHASE]} text-white`}
        >
          {APP_PHASE.toUpperCase()}
        </Badge>
      </div>
      <div className="flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-primary">{APP_VERSION}</span>
        <span className="text-[10px] text-muted-foreground group-hover:text-accent transition-colors duration-300">
          Click to Update
        </span>
      </div>
    </div>
  );
};

export default AppVersion;