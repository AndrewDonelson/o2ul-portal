// file: /convex/files.ts
// feature: File storage functions

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./users";

// Separate the auth check into a utility function
async function checkAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await checkAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileStorageId = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }
    return file.storageId;
  },
});

export const getUrl = mutation({
  args: { 
    storageId: v.id("_storage") 
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getFileUrl = query({
  args: {
    storageId: v.id("_storage")
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  }
});

export const addFile = mutation({
  args: {
    name: v.string(),
    contentType: v.string(),
    storageId: v.id("_storage"),
    size: v.number(),
    md5Hash: v.optional(v.string()), // Make md5Hash optional
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await getUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.insert("files", {
      userId: user._id,
      name: args.name,
      contentType: args.contentType,
      storageId: args.storageId,
      size: args.size,
      createdAt: Date.now(),
      md5Hash: args.md5Hash, // Will be undefined if not provided
    });
  },
});

export const removeFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    const user = await getUser(ctx);
    if (!user || file.userId !== user._id) {
      throw new Error("Not authorized to delete this file");
    }

    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
  },
});

/**
 * Retrieves a file record based on its MD5 hash for the authenticated user.
 *
 * This query function searches for a file with the given MD5 hash that belongs
 * to the currently authenticated user. It ensures that users can only access
 * their own files.
 *
 * @param {Object} args - The arguments for the query.
 * @param {string} args.md5Hash - The MD5 hash of the file to retrieve.
 * 
 * @returns {Promise<File | null>} A promise that resolves to the file record if found,
 *                                 or null if no matching file is found.
 * 
 * @throws {Error} If the user is not authenticated or if the user is not found in the database.
 */
// In convex/users.ts

export const getFileByMd5Hash = query({
  args: { md5Hash: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("User not authenticated");
      return null;
    }

    const user = await getUser(ctx);
    if (!user) {
      console.log("User not found");
      return null;
    }

    return await ctx.db
      .query("files")
      .withIndex("by_user_and_md5", (q) =>
        q.eq("userId", user._id).eq("md5Hash", args.md5Hash)
      )
      .first();
  },
});
