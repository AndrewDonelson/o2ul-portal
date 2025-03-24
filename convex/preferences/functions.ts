// file: /convex/preferences/functions.ts
// feature: Core - App preferences management functions

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { APP_MODES, OAUTH_PROVIDERS, AppMode, SystemPreferences } from "./types";
import { debug } from "../../lib/utils";
import { paginationOptsValidator } from "convex/server";

const DEFAULT_PREFERENCES: Omit<SystemPreferences, "_id"> = {
  mode: APP_MODES.LIVE,
  enableCalling: false,
  enabledOAuthProviders: [OAUTH_PROVIDERS.GOOGLE, OAUTH_PROVIDERS.GITHUB],
  lastUpdated: Date.now(),
  updatedBy: "system" as any
};

export const get = query({
  handler: async (ctx): Promise<SystemPreferences | null> => {
    try {
      const preferences = await ctx.db
        .query("preferences")
        .first();

      if (!preferences) {
        debug("Preferences", "No preferences found, using defaults");
        return DEFAULT_PREFERENCES as SystemPreferences;
      }

      // Ensure enableCalling has a value
      return {
        ...preferences,
        enableCalling: preferences.enableCalling ?? DEFAULT_PREFERENCES.enableCalling,
        enabledOAuthProviders: preferences.enabledOAuthProviders ?? DEFAULT_PREFERENCES.enabledOAuthProviders
      };
    } catch (error) {
      debug("Preferences", "Error fetching preferences", error);
      return DEFAULT_PREFERENCES as SystemPreferences;
    }
  },
});

export const updateMode = mutation({
  args: {
    mode: v.union(...Object.values(APP_MODES).map(v.literal)),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const now = Date.now();

    try {
      const preferences = await ctx.db
        .query("preferences")
        .first();

      if (preferences) {
        await ctx.db.patch(preferences._id, {
          mode: args.mode,
          lastUpdated: now,
          updatedBy: userId
        });
      } else {
        await ctx.db.insert("preferences", {
          mode: args.mode,
          enableCalling: true,
          enabledOAuthProviders: DEFAULT_PREFERENCES.enabledOAuthProviders,
          lastUpdated: now,
          updatedBy: userId
        });
      }

      debug("Preferences", "Mode updated successfully", { 
        mode: args.mode,
        updatedBy: userId,
        timestamp: now
      });
    } catch (error) {
      debug("Preferences", "Error updating mode", error);
      throw new Error("Failed to update app mode");
    }
  },
});

export const updateCallingState = mutation({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const now = Date.now();

    try {
      const preferences = await ctx.db
        .query("preferences")
        .first();

      if (preferences) {
        await ctx.db.patch(preferences._id, {
          enableCalling: args.enabled,
          lastUpdated: now,
          updatedBy: userId
        });
      } else {
        await ctx.db.insert("preferences", {
          mode: APP_MODES.LIVE,
          enableCalling: args.enabled,
          enabledOAuthProviders: DEFAULT_PREFERENCES.enabledOAuthProviders,
          lastUpdated: now,
          updatedBy: userId
        });
      }

      debug("Preferences", "Calling state updated successfully", { 
        enabled: args.enabled,
        updatedBy: userId,
        timestamp: now
      });
    } catch (error) {
      debug("Preferences", "Error updating calling state", error);
      throw new Error("Failed to update calling state");
    }
  },
});

export const updateOAuthProviders = mutation({
  args: {
    enabledProviders: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const now = Date.now();

    try {
      const preferences = await ctx.db
        .query("preferences")
        .first();

      if (preferences) {
        await ctx.db.patch(preferences._id, {
          enabledOAuthProviders: args.enabledProviders,
          lastUpdated: now,
          updatedBy: userId
        });
      } else {
        await ctx.db.insert("preferences", {
          mode: APP_MODES.LIVE,
          enableCalling: DEFAULT_PREFERENCES.enableCalling,
          enabledOAuthProviders: args.enabledProviders,
          lastUpdated: now,
          updatedBy: userId
        });
      }

      debug("Preferences", "OAuth providers updated successfully", { 
        providers: args.enabledProviders,
        updatedBy: userId,
        timestamp: now
      });
    } catch (error) {
      debug("Preferences", "Error updating OAuth providers", error);
      throw new Error("Failed to update OAuth providers");
    }
  },
});

export const getUsersByMode = query({
  args: {
    mode: v.union(...Object.values(APP_MODES).map(v.literal)),
    paginationOpts: paginationOptsValidator
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { page: [], isDone: true };

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    try {
      let query = ctx.db.query("userProfiles");

      if (args.mode === APP_MODES.BETA) {
        query = query.filter(q => q.eq(q.field("isBetaTester"), true));
      }

      const paginatedProfiles = await query.paginate(args.paginationOpts);

      const usersWithStatus = await Promise.all(
        paginatedProfiles.page.map(async (profile) => {
          const isUserAdmin = await ctx.db
            .query("admins")
            .withIndex("by_userId")
            .filter(q => q.eq(q.field("userId"), profile.userId))
            .first();

          return {
            userId: profile.userId,
            username: profile.username || "Unknown",
            lastSeen: profile.lastSeen,
            isAdmin: !!isUserAdmin,
            isBetaTester: !!profile.isBetaTester
          };
        })
      );

      return {
        page: usersWithStatus,
        isDone: paginatedProfiles.isDone,
        continueCursor: paginatedProfiles.continueCursor
      };
    } catch (error) {
      debug("Preferences", "Error fetching users by mode", error);
      throw new Error("Failed to fetch users");
    }
  },
});

export const isOAuthProviderEnabled = query({
  args: {
    provider: v.string()
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("preferences")
      .first();

    if (!preferences) {
      // Use defaults if no preferences are set
      return DEFAULT_PREFERENCES.enabledOAuthProviders?.includes(args.provider) ?? false;
    }

    return preferences.enabledOAuthProviders?.includes(args.provider) ?? false;
  }
});