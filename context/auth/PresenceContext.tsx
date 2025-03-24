// file: /context/PresenceContext.tsx
// description: Auth Core presence context for tracking online users
import { createContext, useContext, ReactNode, useMemo, useCallback, useEffect, useState } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { debug } from "@/lib/utils";

// Constants
const ONLINE_THRESHOLD_MS = 60000; // 1 minute
const UPDATE_INTERVAL_MS = 60000; // Check every minute

interface PresenceContextType {
  getPresence: (userId: Id<"users">) => boolean; // true if online, false if offline
  getOnlineUsers: () => Set<Id<"users">>; // Set of online user IDs
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Query presence data when authenticated - this now uses userProfiles
  const presenceData = useQuery(
    api.users.listUsersPresence,
    isAuthenticated ? {} : "skip"
  );

  // Force a refresh every minute by updating lastUpdate
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Memoize the online users set
  const onlineUsers = useMemo(() => {
    const onlineSet = new Set<Id<"users">>();

    if (!presenceData) return onlineSet;

    for (const presence of presenceData) {
      if (presence?.userId) {
        onlineSet.add(presence.userId);
      }
    }

    debug("PresenceContext", "Online users count:", onlineSet.size);
    return onlineSet;
  }, [presenceData]); // Note: removed lastUpdate since the query itself filters by time

  // Memoize the getPresence function
  const getPresence = useCallback((userId: Id<"users">) => {
    if (!isAuthenticated) return false;
    return onlineUsers.has(userId);
  }, [isAuthenticated, onlineUsers]);

  // Memoize getOnlineUsers function
  const getOnlineUsers = useCallback(() => {
    return onlineUsers;
  }, [onlineUsers]);

  // Memoize the context value
  const value = useMemo(() => ({
    getPresence,
    getOnlineUsers
  }), [getPresence, getOnlineUsers]);

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error("usePresenceContext must be used within PresenceProvider");
  }
  return context;
}

// Simplified presence info type
interface PresenceInfo {
  status: 'online' | 'offline';
}

// Hook for getting a single user's presence (backward compatible name)
export function useUserPresence(userId: Id<"users">) {
  const { getPresence } = usePresenceContext();
  return useMemo(() => ({
    status: getPresence(userId) ? 'online' : 'offline'
  }), [getPresence, userId]);
}

// Hook for getting presence for a list of users (backward compatible name)
export function useUsersPresence(userIds: Id<"users">[]) {
  const { getPresence } = usePresenceContext();
  return useMemo(() =>
    userIds.reduce((acc, userId) => {
      acc[userId.toString()] = {
        status: getPresence(userId) ? 'online' : 'offline'
      };
      return acc;
    }, {} as Record<string, PresenceInfo>),
    [getPresence, userIds]
  );
}

// New hooks with more explicit names
export function useUserOnline(userId: Id<"users">) {
  const { getPresence } = usePresenceContext();
  return useMemo(() => getPresence(userId), [getPresence, userId]);
}

// Hook for getting all online users
export function useOnlineUsers() {
  const { getOnlineUsers } = usePresenceContext();
  return useMemo(() => getOnlineUsers(), [getOnlineUsers]);
}