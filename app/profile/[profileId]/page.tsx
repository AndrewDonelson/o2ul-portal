// file: /app/profile/[profileId]/page.tsx
// feature: App - Profile page route handler

"use client";

import { useParams } from "next/navigation";
import Profile from "@/components/app/Profile";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function ProfilePage() {
  const params = useParams();
  const viewer = useQuery(api.users.index.viewer);
  const profileId = params.profileId as Id<"users">;

  return (
    <Profile 
      profileId={profileId} 
      isOwner={viewer?.userId === profileId}
    />
  );
}