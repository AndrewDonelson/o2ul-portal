// file: /components/shared/UserPlaque.tsx
// feature: UI - User identification component

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { StatusIndicator } from "@/components/shared/StatusIndicator";
import { Shield } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { memo, useMemo } from 'react';

interface UserPlaqueProps {
  userId: Id<"users">;
  username?: string;
  role?: string;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  showRole?: boolean;
  className?: string;
  lastSeen?: number;
  onClick?: () => void;
}

type StatusType = "online" | "offline" | "away" | "busy";

const sizes = {
  sm: {
    container: "h-8",
    avatar: "h-6 w-6",
    name: "text-sm",
    role: "text-xs",
  },
  md: {
    container: "h-10",
    avatar: "h-8 w-8",
    name: "text-base",
    role: "text-sm",
  },
  lg: {
    container: "h-12",
    avatar: "h-10 w-10",
    name: "text-lg",
    role: "text-base",
  },
} as const;

const truncateUsername = (username: string, maxLength: number = 16): string => {
  if (username.length <= maxLength) return username;
  return `${username.slice(0, maxLength)}*`;
};

export const UserPlaque = memo(function UserPlaqueComponent({
  userId,
  username: propUsername,
  role,
  size = "md",
  showStatus = true,
  showRole = true,
  className,
  lastSeen,
  onClick
}: UserPlaqueProps) {
  const user = useQuery(api.users.index.get, { userId });
  //const presence = useUserPresence(userId);
  
  // Memorize presence status calculations
  // const { presenceStatus, isOnline } = useMemo(() => {
  //   const presenceStatus = presence?.status || "offline";
  //   const isOnline = presenceStatus === "online";
    
  //   return { presenceStatus, isOnline };
  // }, [presence]);

  // Memoize display values
  const { avatarUrl, displayName } = useMemo(() => ({
    avatarUrl: user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`,
    displayName: truncateUsername(propUsername || user?.username || 'Anonymous'),
    
  }), [user, userId, propUsername]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 rounded-lg",
        sizes[size].container,
        onClick && "cursor-pointer hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="relative">
        <Avatar className={sizes[size].avatar}>
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {showStatus && (
          <div className="absolute -bottom-0.5 -right-0.5">
            <StatusIndicator 
              lastSeen={lastSeen}
              size={size === "lg" ? "md" : "sm"}
              // pulseAnimation={null}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("font-medium truncate", sizes[size].name)}>
            {displayName}
          </span>
          {showRole && role && role !== "member" && (
            <Shield className={cn(
              "text-primary shrink-0",
              size === "sm" && "h-3 w-3",
              size === "md" && "h-4 w-4",
              size === "lg" && "h-5 w-5"
            )} />
          )}
        </div>
        {showRole && role && (
          <span className={cn(
            "text-muted-foreground truncate",
            sizes[size].role
          )}>
            {role}
          </span>
        )}
      </div>
    </div>
  );
});

// Add display name for debugging purposes
UserPlaque.displayName = 'UserPlaque';

// Export as both default and named export
export default UserPlaque;