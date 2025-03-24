// file: ./convex/users/mutations.ts
// feature: Chat - User mutation functions

import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const initUser = mutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .filter(q => q.eq(q.field("userId"), userId))
      .first() as { [key: string]: any } | null;

    if (existingProfile) {
      return await ctx.db.patch(existingProfile._id, {
        ...args,
        lastLoginDate: Date.now(),
        lastSeen: Date.now(),
        isOnline: true
      });
    }

    // Create new user profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      username: args.username,
      name: args.username || "New User",
      email: args.email,
      phone: args.phone,
      isAnonymous: false,
      isOnline: true,
      lastLoginDate: Date.now(),
      lastSeen: Date.now(),
      isBanned: false,
      credits: 0
    });

    const profile = await ctx.db.get(profileId);
    const user = await ctx.db.get(userId);
    return { ...user, ...profile };
  },
});

export const updateProfile = mutation({
  args: {
    username: v.optional(v.string()),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    bgImageUrl: v.optional(v.string()),
    bgImageStorageId: v.optional(v.union(v.string(), v.id("_storage"))),
    bgImageOpacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get existing profile
    const existingProfile = await ctx.db
      .query("userProfiles")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    // Only update fields that have changed
    const updates: Record<string, any> = {};
    Object.entries(args).forEach(([key, value]) => {
      if (value !== undefined && value !== (existingProfile as any)?.[key]) {
        updates[key] = value;
      }
    });

    // If no changes, return early
    if (Object.keys(updates).length === 0) {
      return existingProfile;
    }

    // Update or create profile
    if (existingProfile) {
      return await ctx.db.patch(existingProfile._id, updates);
    } else {
      return await ctx.db.insert("userProfiles", {
        userId,
        ...updates,
      });
    }
  },
});

// Delete platform-specific user data
export const deletePlatformData = mutation({
  args: { platform: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get identity to verify platform
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No identity found");
    if (identity.issuer !== args.platform) {
      throw new Error("Platform mismatch");
    }

    try {
      // Delete user profile
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user")
        .filter(q => q.eq(q.field("userId"), userId))
        .first();
      if (userProfile) {
        await ctx.db.delete(userProfile._id);
      }

      // Note: We don't delete the base user record as it's managed by Convex Auth

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete user data: ${error}`);
    }
  },
});

export const updateBackgroundImage = mutation({
  args: {
    bgImageUrl: v.string(),
    bgImageStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingProfile = await ctx.db
      .query("userProfiles")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    if (existingProfile) {
      return await ctx.db.patch(existingProfile._id, {
        bgImageUrl: args.bgImageUrl,
        bgImageStorageId: args.bgImageStorageId
      });
    } else {
      return await ctx.db.insert("userProfiles", {
        userId,
        bgImageUrl: args.bgImageUrl,
        bgImageStorageId: args.bgImageStorageId
      });
    }
  },
});