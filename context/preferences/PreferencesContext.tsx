// file: /context/preferences/PreferencesContext.tsx
// feature: Core - Global preferences context provider
/* Example usage in a component
import { usePreferences, useCallingEnabled, useAppMode } from "@/context/preferences/PreferencesContext";

// Full preferences access
function ExampleComponent() {
  const { preferences, isLoading } = usePreferences();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Current Mode: {preferences?.mode}</h1>
      <p>Calling enabled: {preferences?.enableCalling ? 'Yes' : 'No'}</p>
    </div>
  );
}

// Specific feature check
function CallButton() {
  const { isEnabled, isLoading } = useCallingEnabled();
  
  if (isLoading) return null;
  if (!isEnabled) return null;
  
  return <button>Start Call</button>;
}

// Mode-specific features
function BetaFeatures() {
  const { mode, isLoading } = useAppMode();
  
  if (isLoading) return null;
  if (mode !== 'beta') return null;
  
  return <div>Beta Features</div>;
}
*/
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SystemPreferences } from "@/convex/preferences/types";
import { debug } from "@/lib/utils";

interface PreferencesContextType {
    preferences: SystemPreferences | null;
    isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const preferencesQuery = useQuery(api.preferences.functions.get);
    const [preferences, setPreferences] = useState<SystemPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const lastFetchTimeRef = useRef<number | null>(null);
    const cachedPreferencesRef = useRef<SystemPreferences | null>(null);

    useEffect(() => {
        const now = Date.now();
        const CACHE_DURATION = 30 * 1000; // 30 seconds

        // Check if we have cached preferences and they're still valid
        if (
            cachedPreferencesRef.current && 
            lastFetchTimeRef.current && 
            now - lastFetchTimeRef.current < CACHE_DURATION
        ) {
            debug("Preferences", "Using cached preferences", { 
                preferences: cachedPreferencesRef.current,
                cachedAt: lastFetchTimeRef.current
            });
            setPreferences(cachedPreferencesRef.current);
            setIsLoading(false);
            return;
        }

        // If query is available
        if (preferencesQuery) {
            // First time loading or cache expired
            if (!cachedPreferencesRef.current) {
                debug("Preferences", "Loaded fresh preferences", { 
                    preferences: preferencesQuery 
                });
            } else {
                debug("Preferences", "Preferences cache expired, refreshing", { 
                    oldPreferences: cachedPreferencesRef.current,
                    newPreferences: preferencesQuery 
                });
            }

            // Update cache and state
            cachedPreferencesRef.current = preferencesQuery;
            lastFetchTimeRef.current = now;
            setPreferences(preferencesQuery);
            setIsLoading(false);
        }
    }, [preferencesQuery]);

    return (
        <PreferencesContext.Provider value={{ preferences, isLoading }}>
            {children}
        </PreferencesContext.Provider>
    );
}

// Hook for accessing preferences
export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error("usePreferences must be used within a PreferencesProvider");
    }
    return context;
}

// Utility hook for quickly checking if calling is enabled
export function useCallingEnabled() {
    const { preferences, isLoading } = usePreferences();
    return {
        isEnabled: preferences?.enableCalling ?? false,
        isLoading
    };
}

// Utility hook for checking app mode
export function useAppMode() {
    const { preferences, isLoading } = usePreferences();
    return {
        mode: preferences?.mode,
        isLoading
    };
}

// Utility hook for checking OAuth providers
export function useOAuthProviders() {
    const { preferences, isLoading } = usePreferences();
    return {
        providers: preferences?.enabledOAuthProviders ?? [],
        isLoading
    };
}