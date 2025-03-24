// file: /convex/auth/syncProfile.ts
// feature: Auth - Profile synchronization

import { DatabaseWriter, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { debug } from "../../lib/utils";
import {
  ProfileUpdate,
  UserUpdate,
  NewProfileData,
  SignInParams,
  NormalizedAuthData,
  NewProfileParams,
  ProfileUpdateParams
} from "./types";
import { normalizeAuthData } from "./funcs.providers";

export const syncProfile = mutation({
  args: {
    action: v.union(v.literal("signIn"), v.literal("signOut")),
  },
  handler: async (ctx, args) => {
    debug("Auth Sync", `Starting ${args.action}`);
    const identity = await ctx.auth.getUserIdentity();
    const userId = await getAuthUserId(ctx);
    if (!userId || !identity) {
      debug("Auth Sync", "No identity or userId");
      return null;
    }

    debug("Auth Sync", "Raw Identity Data", identity);

    const now = Date.now();

    // Get existing profile and user records
    const [existingProfile, user] = await Promise.all([
      ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
      ctx.db.get(userId)
    ]);

    debug("Auth Sync", "Existing Records", {
      profile: existingProfile ?
        { username: existingProfile.username, image: existingProfile.image } :
        "none",
      user: user ? { image: user.image } : "none"
    });

    try {
      const normalizedAuth = normalizeAuthData(identity);
      debug("Auth Sync", "Normalized auth data", normalizedAuth);

      if (args.action === "signIn") {
        await handleSignIn(ctx, {
          identity: normalizedAuth,
          userId,
          existingProfile,
          now,
          provider: normalizedAuth.provider
        });
      } else if (args.action === "signOut" && existingProfile) {
        await handleSignOut(ctx, {
          userId,
          existingProfile,
          now
        });
      }
    } catch (error) {
      debug("Auth Sync", "Error during profile sync", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        provider: identity.tokenIdentifier?.split(":")[0],
        userId,
        existingProfile: !!existingProfile,
        action: args.action
      });
      // Optional: Throw a more specific error or return an error response
      // throw new Error("Failed to sync profile");
    }

    return userId;
  },
});

async function handleSignIn(ctx: any, params: SignInParams) {
  const { identity, userId, existingProfile, now } = params;
  debug("Auth Sync", "Starting SignIn Process", { identity });

  if (!existingProfile) {
    debug("Auth Sync", "Creating New Profile", {
      username: identity.username,
      provider: identity.provider
    });
    await createNewProfile(ctx, {
      userId,
      username: identity.username,
      name: identity.name,
      image: identity.image,
      email: identity.email,
      now,
      provider: identity.provider,
      providerId: identity.providerId
    });
  } else {
    debug("Auth Sync", "Updating Existing Profile", {
      existingUsername: existingProfile.username,
      provider: identity.provider
    });
    await updateExistingProfile(ctx, {
      userId,
      existingProfile,
      username: identity.username,
      name: identity.name,
      image: identity.image,
      email: identity.email,
      now,
      provider: identity.provider,
      providerId: identity.providerId
    });
  }

  //await updateChannelPresence(ctx, userId, "online", now);
  return userId;
}

interface SignOutParams {
  userId: Id<"users">;
  existingProfile: any;
  now: number;
}

async function handleSignOut(ctx: any, { userId, existingProfile, now }: SignOutParams) {
  debug("Auth Sync", "Processing sign out");

  await ctx.db.patch(existingProfile._id, {
    isOnline: false,
    lastSeen: now
  });

  //await updateChannelPresence(ctx, userId, "offline", now);
}

async function updateExistingProfile(ctx: any, params: ProfileUpdateParams) {
  const { userId, existingProfile, username, name, image, email, now, provider, providerId } = params;
  debug("Auth Sync", "Update Existing Profile", { existingProfile });

  // Only update mandatory status fields
  const profileUpdates: ProfileUpdate = {
    lastLoginDate: now,
    lastSeen: now,
    isOnline: true,
    // provider,
    // providerId
  };

  // Skip auth data if it's empty/invalid
  if (username && username.length > 0 && !username.startsWith('User-')) {
    profileUpdates.username = username;
  }
  if (name && name.length > 0) {
    profileUpdates.name = name;
  }
  if (email && email.length > 0) {
    profileUpdates.email = email;
  }
  if (image && image.length > 0) {
    profileUpdates.image = image;
  }

  debug("Auth Sync", "Profile Updates", {
    updates: profileUpdates
  });

  // Apply updates
  await ctx.db.patch(existingProfile._id, profileUpdates);

  // Update user record if needed
  const userUpdates: UserUpdate = {};
  if (name) userUpdates.name = name;
  if (email) userUpdates.email = email;
  if (image) userUpdates.image = image;

  if (Object.keys(userUpdates).length > 0) {
    await ctx.db.patch(userId, userUpdates);
    debug("Auth Sync", "User Updates", { userUpdates });
  }
}

async function createNewProfile(ctx: any, params: NewProfileParams) {
  const { userId, username, name, image, email, now, provider, providerId } = params;
  const profileData: NewProfileData = {
    userId,
    username: username || email?.split('@')[0] || `user_${userId}`,
    name,
    email,
    lastLoginDate: now,
    lastSeen: now,
    isOnline: true,
    isAnonymous: false,
    credits: 0,
    isBanned: false,
    provider,
    providerId,
  };

  if (image) {
    profileData.image = image;
  }

  await ctx.db.insert("userProfiles", profileData);
  debug("Auth Sync", "Created new profile", { profileData });

  const userUpdates: UserUpdate = {
    name,
    email
  };

  if (image) {
    userUpdates.image = image;
  }

  await ctx.db.patch(userId, userUpdates);
  debug("Auth Sync", "Created user", { userUpdates });

  await ctx.runMutation(api.init.initializeUser);
}

// interface ChannelMembership {
//   _id: Id<"channelMembers">;
// }

// async function updateChannelPresence(
//   ctx: { db: DatabaseWriter },
//   userId: Id<"users">,
//   status: "online" | "offline",
//   now: number
// ) {
//   const userChannels = await ctx.db
//     .query("channelMembers")
//     .withIndex("by_user", q => q.eq("userId", userId))
//     .collect();

//   await Promise.all(
//     userChannels.map((membership: ChannelMembership) =>
//       ctx.db.patch(membership._id, {
//         presenceStatus: status,
//         lastActive: now
//       })
//     )
//   );

//   debug("Auth Sync", "Updated channel presence", {
//     userId,
//     status,
//     channelCount: userChannels.length
//   });
// }