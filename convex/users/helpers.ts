// file: ./convex/users/helpers.ts
// feature: Chat - User helper functions

import { getAuthUserId } from "@convex-dev/auth/server";
import { AdminRole, RolePermissions } from "../auth/types";
import { Id } from "../_generated/dataModel";
import { UserRole } from "./types";
import { debug } from "../../lib/utils";

// Helper function to get user's role
export async function getUserRole(ctx: any, userId: Id<"users">): Promise<UserRole> {
  // Check various admin roles using the helper functions
  const adminRecord = await ctx.db
    .query("admins")
    .withIndex("by_userId")
    .filter((q: { eq: (arg0: any, arg1: Id<"users">) => any; field: (arg0: string) => any; }) => 
      q.eq(q.field("userId"), userId))
    .first();
    
  const userProfile = await ctx.db
    .query("userProfiles")
    .filter((q: { eq: (arg0: any, arg1: Id<"users">) => any; field: (arg0: string) => any; }) => 
      q.eq(q.field("userId"), userId))
    .first();
    
  const role = adminRecord?.role as AdminRole | undefined;
  const isBetaTester = userProfile?.isBetaTester ?? false;

  if (role === AdminRole.ADMINISTRATOR) {
    return 'administrator';
  }

  if (role === AdminRole.SYSOP) {
    return 'sysop';
  }

  if (role === AdminRole.MODERATOR) {
    return 'moderator';
  }

  if (role === AdminRole.FINANCIER) {
    return 'financier';
  }

  if (isBetaTester) {
    return 'beta-tester';
  }

  return 'member';
}

// Helper function to get the user
export async function getUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  console.log("getUser->userId:", userId);

  const user = ctx.db.get(userId);
  if (!user) {
    return undefined;
  }
  console.log("getUser->user:", user);

  return user;
}