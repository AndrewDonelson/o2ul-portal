// file: /hooks/chat/usePresence.ts
// feature: Chat - User presence management hook

import { useEffect } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Update interval in milliseconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const PRESENCE_TIMEOUT = 60000; // 1 minute

export function usePresence() {
  const { isAuthenticated } = useConvexAuth();
  const updatePresence = useMutation(api.presence.updatePresence);
  const globalPresence = useQuery(api.presence.getPresence);
  useEffect(() => {
    if (!isAuthenticated) return;

    // Update global presence
    const initialUpdate = async () => {
      await updatePresence({ status: "online" });
    };

    initialUpdate();

    // Regular heartbeat for global presence
    const interval = setInterval(() => {
      updatePresence({ status: "online" });
    }, HEARTBEAT_INTERVAL);

    // Handle visibility changes
    const handleVisibilityChange = () => {
      updatePresence({
        status: document.hidden ? "away" : "online"
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updatePresence({ status: "offline" });
    };
  }, [isAuthenticated, updatePresence]);

  return globalPresence;
}