// file: ./convex/users/queries.ts
// feature: Chat - User query functions

import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import { AdminPermission, AdminRole, RolePermissions } from "../auth/types";
import { getUserRole, getUser } from "./helpers";
import { debug } from "../../lib/utils";

export const viewer = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    if (!userId || !identity) return null;

    const [user, userProfile, adminRecord] = await Promise.all([
      ctx.db.get(userId),
      ctx.db.query("userProfiles")
        .filter(q => q.eq(q.field("userId"), userId))
        .first(),
      ctx.db.query("admins")
        .withIndex("by_userId")
        .filter(q => q.eq(q.field("userId"), userId))
        .first(),
    ]);

    if (!user) return null;

    // Use the helper function to get user role
    const role = await getUserRole(ctx, userId);

    return {
      userId,
      username: userProfile?.username || identity.nickname || identity.email?.split('@')[0],
      name: userProfile?.name || identity.name,
      email: userProfile?.email || identity.email,
      image: userProfile?.image || identity.pictureUrl || user?.image,
      role,
      isAnonymous: userProfile?.isAnonymous ?? false,
      isOnline: userProfile?.isOnline ?? true,
      isAdmin: !!adminRecord,
      adminRole: adminRecord?.role,
      isBetaTester: userProfile?.isBetaTester ?? false,
      isHookupEnabled: userProfile?.isHookupEnabled ?? false,
      lastSeen: userProfile?.lastSeen,
      presenceStatus: "online"
    };
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const [user, userProfile] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db.query("userProfiles")
        .filter(q => q.eq(q.field("userId"), args.userId))
        .first()
    ]);

    if (!user) return null;

    const isAdmin = !!(await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), user._id))
      .first());

    return {
      userId: args.userId,
      username: userProfile?.username || user?.name,
      name: userProfile?.name || user?.name,
      avatar: userProfile?.image || user?.image,
      bio: userProfile?.bio,
      bgImageUrl: userProfile?.bgImageUrl,
      framebgImageUrl: userProfile?.framebgImageUrl,
      isOnline: userProfile?.isOnline ?? false,
      role: "member", // Public view always shows base role
      isAdmin
    };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      debug("getCurrentUser", "No authenticated user found");
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      debug("getCurrentUser", "User record not found");
      return null;
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    return {
      ...user,
      ...userProfile
    };
  },
});

export const getAdminDetails = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    if (!adminRecord) return null;

    // Safely handle the role permissions
    const rolePermissions = adminRecord.role && RolePermissions[adminRecord.role as AdminRole];
    const defaultPermissions = Array.isArray(rolePermissions) ? rolePermissions : [];
    const customPermissions = Array.isArray(adminRecord.customPermissions) ? adminRecord.customPermissions : [];
    
    // Combine default role permissions with any custom permissions
    const permissions = [
      ...defaultPermissions,
      ...customPermissions
    ];

    return {
      userId,
      role: adminRecord.role,
      permissions,
      assignedBy: adminRecord.assignedBy,
      assignedAt: adminRecord.assignedAt,
    };
  },
});

// Helper function to check if a user has a specific permission
export const hasAdminPermission = query({
  args: {
    permission: v.union(...Object.values(AdminPermission).map(v.literal))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    if (!adminRecord) return false;

    // Check if permission is in default role permissions or custom permissions
    const rolePermissions = RolePermissions[adminRecord.role as AdminRole];
    const hasDefaultPermission = rolePermissions.includes(args.permission);
    const hasCustomPermission = adminRecord.customPermissions?.includes(args.permission);

    return hasDefaultPermission || hasCustomPermission;
  },
});

// Shortcut functions for role checking
export const isModerator = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    return adminRecord?.role === AdminRole.MODERATOR ||
      adminRecord?.role === AdminRole.SYSOP ||
      adminRecord?.role === AdminRole.ADMINISTRATOR;
  },
});

export const isSysOp = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    return adminRecord?.role === AdminRole.SYSOP ||
      adminRecord?.role === AdminRole.ADMINISTRATOR;
  },
});

export const isFinancier = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    return adminRecord?.role === AdminRole.FINANCIER ||
      adminRecord?.role === AdminRole.ADMINISTRATOR;
  },
});

export const listUsersPresence = query({
  args: {},
  handler: async (ctx) => {
    // Calculate threshold timestamp for the last minute
    const oneMinuteAgo = Date.now() - 60000;

    const userProfiles = await ctx.db
      .query("userProfiles")
      .filter(q => q.gte(q.field("lastSeen"), oneMinuteAgo))
      .collect();

    return Promise.all(
      userProfiles.map(async (profile) => ({
        userId: profile.userId,
        lastSeen: profile.lastSeen
      }))
    );
  },
});

export const getMembersCount = query({
  args: {},
  handler: async (ctx, args) => {
    // Count total active user profiles
    const totalMembers = await ctx.db
      .query("userProfiles")
      .collect()
      .then(profiles => profiles.length);

    return totalMembers;
  },
});

export const globalMemberSearch = query({
  args: {
    search: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchLower = args.search.toLowerCase();

    const userProfiles = await ctx.db
      .query("userProfiles")
      .collect();

    const filteredProfiles = userProfiles.filter(profile =>
      (profile.username?.toLowerCase().includes(searchLower)) ||
      (profile.name?.toLowerCase().includes(searchLower))
    ).slice(0, args.limit ?? 50);

    return Promise.all(
      filteredProfiles.map(async profile => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...user,
          ...profile,
          role: 'member', // Default role for global search
          presenceStatus: 'offline', // Default for global search
        };
      })
    );
  },
});

export const getUserProfiles = query({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userProfiles = await Promise.all(
      args.userIds.map(async (userId) => {
        const profile = await ctx.db
          .query("userProfiles")
          .filter(q => q.eq(q.field("userId"), userId))
          .first();

        if (!profile) {
          // Return minimal profile if none exists
          return {
            userId,
            username: "anonymous",
            name: "Anonymous User",
          };
        }

        return profile;
      })
    );

    return userProfiles;
  },
});

export const list = query({
  handler: async (ctx) => {
    const userProfiles = await ctx.db.query("userProfiles").collect();

    return Promise.all(userProfiles.map(async profile => {
      const user = await ctx.db.get(profile.userId);
      return {
        ...user,
        ...profile,
      };
    }));
  },
});

// Get platform-specific user data
export const getPlatformData = query({
  args: { platform: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get user identity to check auth provider
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No identity found");

    // Get user profile
    const userProfile = await ctx.db
      .query("userProfiles")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    return {
      identity: {
        provider: args.platform,
        email: identity.email,
        name: identity.name,
        pictureUrl: identity.pictureUrl,
      },
      profile: userProfile ? {
        username: userProfile.username,
        email: userProfile.email,
        name: userProfile.name,
        phone: userProfile.phone,
        image: userProfile.image,
        createdAt: userProfile._creationTime,
        lastLoginDate: userProfile.lastLoginDate,
        lastSeen: userProfile.lastSeen,
      } : null,
      timestamps: {
        profileCreated: userProfile?._creationTime,
        lastActive: userProfile?.lastSeen,
        emailVerified: userProfile?.emailVerificationTime,
      }
    };
  },
});

export const getUserFiles = query({
  args: {
    contentType: v.optional(v.union(v.literal("image"), v.literal("audio")))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await getUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    let filesQuery = ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("userId"), user._id));

    if (args.contentType) {
      filesQuery = filesQuery.filter((q) =>
        q.eq(q.field("contentType"),
          args.contentType === "image" ? "image/png" : "audio/mpeg"
        )
      );
    }

    const files = await filesQuery.collect();

    return Promise.all(files.map(async (file) => ({
      _id: file._id,
      url: await ctx.storage.getUrl(file.storageId),
      name: file.name,
      storageId: file.storageId,
      contentType: file.contentType,
      size: file.size,
      createdAt: file.createdAt,
    })));
  },
});

export const searchUserFiles = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await getUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db
      .query("files")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.searchTerm).eq("userId", user._id)
      )
      .collect();
  },
});