// file: /convex/init.ts
// feature: Chat - Initial setup with auth check

import { debug } from "../lib/utils";
import { api } from "./_generated/api";
import { action, internalMutation, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Initialize for a specific user
export const initializeUser = mutation({
  args: {},
  handler: async (ctx) => {
    debug("Init","Initializing user");
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check if user has been initialized
    debug("Init","Checking if user has been initialized", userId);
    const userInitialized = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("_id"), userId))
      .first();

    // If user hasn't been initialized yet
    if (!userInitialized) {
      debug("Init","User not initialized, initializing", userId);
      await initializeWelcomeChannel(ctx, userId);
      debug("Init","User initialized successfully", userId);
      return true;
    }

    return false;
  }
});

// Internal function to create welcome channel
const initializeWelcomeChannel = async (
  ctx: any,
  userId: Id<"users">
) => {
  // Check if welcome channel exists
  
  debug("Init","Checking for welcome channel...");
  const welcomeChannel = await ctx.db
    .query("channels")
    .filter((q: { eq: (arg0: any, arg1: string) => any; field: (arg0: string) => any; }) => q.eq(q.field("name"), "Welcome"))
    .first();

  if (!welcomeChannel) {
    debug("Init","Creating welcome channel with userId ", userId);
    
    // Create channel
    const channelId = await ctx.db.insert("channels", {
      name: "Welcome",
      description: "Default Foching Chat",
      visibility: "public" as const,
      listing: "listed" as const,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Add owner as member
    debug("Init","Adding owner as member to welcome channel", userId);
    await ctx.db.insert("channelMembers", {
      channelId,
      userId,
      role: "owner" as const,
      status: "active" as const,
      joinedAt: Date.now(),
    });

    // Add welcome messages
    debug("Init","Adding welcome messages to welcome channel", channelId);
    await ctx.db.insert("messages", {
      body: "Welcome to the Foching channel!",
      channelId,
      userId,
    });

    await ctx.db.insert("messages", {
      body: "Start messaging in this channel or create your own.",
      channelId,
      userId,
    });

    debug("Init","Welcome channel created successfully", channelId);
    return channelId;
  }

  return welcomeChannel._id;
};

// Legacy init function - now just returns immediately
export const initializeChat = action({
  handler: async (ctx) => {
    debug("Init","Legacy init function called, skipping...");
    return null;
  }
});