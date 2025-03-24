// file: /convex/admin/users.ts
// feature: Administration - User management server functions

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
//import * as Types from "../hookup/types"; // Import the types
import { AdminRole } from "../auth/types";

// List users with pagination and search
export const list = query({
  args: {
    searchQuery: v.optional(v.string()),
    pagination: v.object({
      page: v.number(),
      pageSize: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Verify admin status
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { users: [], totalUsers: 0, totalPages: 0 };
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    if (!isAdmin) {
      return { users: [], totalUsers: 0, totalPages: 0 };
    }

    // Calculate pagination values
    const { page, pageSize } = args.pagination;
    const skip = (page - 1) * pageSize;
    
    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    
    // Apply search filter if provided
    const filteredUsers = args.searchQuery 
      ? allUsers.filter(user => {
          const searchLower = args.searchQuery!.toLowerCase();
          return (
            user.name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower)
          );
        })
      : allUsers;

    // Calculate total pages
    const totalUsers = filteredUsers.length;
    const totalPages = Math.ceil(totalUsers / pageSize);
    
    // Apply pagination
    const paginatedUsers = filteredUsers.slice(skip, skip + pageSize);
    
    // Fetch related data for each user
    const usersWithProfiles = await Promise.all(
      paginatedUsers.map(async (user) => {
        // Check if user is admin
        const adminRecord = await ctx.db
          .query("admins")
          .withIndex("by_userId")
          .filter(q => q.eq(q.field("userId"), user._id))
          .first();
        
        // Get user profile
        const userProfile = await ctx.db
          .query("userProfiles")
          .filter(q => q.eq(q.field("userId"), user._id))
          .first();
        
        return {
          ...user,
          isAdmin: !!adminRecord,
          adminRole: adminRecord?.role,
          userProfile: userProfile || null,
        };
      })
    );
    
    return {
      users: usersWithProfiles,
      totalUsers,
      totalPages,
    };
  },
});

// Update user details
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    data: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      image: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Verify admin status
    const adminId = await getAuthUserId(ctx);
    if (!adminId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), adminId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    // Update user
    await ctx.db.patch(args.userId, args.data);
    
    return { success: true };
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    profileId: v.id("userProfiles"),
    data: v.object({
      username: v.optional(v.string()),
      bio: v.optional(v.string()),
      phone: v.optional(v.string()),
      isHookupEnabled: v.optional(v.boolean()),
      isBanned: v.optional(v.boolean()),
      credits: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Verify admin status
    const adminId = await getAuthUserId(ctx);
    if (!adminId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), adminId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    // Update user profile
    await ctx.db.patch(args.profileId, args.data);
    
    return { success: true };
  },
});

// Assign admin role (replacing toggleAdminStatus)
export const assignAdminRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(...Object.values(AdminRole).map(v.literal)),
  },
  handler: async (ctx, args) => {
    // Verify admin status
    const adminId = await getAuthUserId(ctx);
    if (!adminId) {
      throw new Error("Not authenticated");
    }

    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), adminId))
      .first();

    if (!adminRecord || adminRecord.role !== AdminRole.ADMINISTRATOR) {
      throw new Error("Not authorized to assign admin roles");
    }

    // Get existing admin record
    const existingAdmin = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingAdmin) {
      // Update existing admin
      return await ctx.db.patch(existingAdmin._id, {
        role: args.role,
        assignedBy: adminId,
        assignedAt: Date.now(),
      });
    } else {
      // Create new admin
      return await ctx.db.insert("admins", {
        userId: args.userId,
        role: args.role,
        assignedBy: adminId,
        assignedAt: Date.now(),
      });
    }
  },
});

// Remove admin role
export const removeAdminRole = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify admin status
    const adminId = await getAuthUserId(ctx);
    if (!adminId) {
      throw new Error("Not authenticated");
    }

    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), adminId))
      .first();

    if (!adminRecord || adminRecord.role !== AdminRole.ADMINISTRATOR) {
      throw new Error("Not authorized to remove admin roles");
    }

    // Find and delete the admin record
    const existingAdmin = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingAdmin) {
      await ctx.db.delete(existingAdmin._id);
      return { success: true };
    }

    return { success: false, message: "No admin record found" };
  },
});

// Toggle beta tester status
export const toggleBetaStatus = mutation({
  args: {
    profileId: v.id("userProfiles"),
    isBeta: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify admin status
    const adminId = await getAuthUserId(ctx);
    if (!adminId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), adminId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    // Update profile
    await ctx.db.patch(args.profileId, {
      isBetaTester: args.isBeta,
      betaTesterSince: args.isBeta ? Date.now() : undefined,
    });
    
    return { success: true };
  },
});