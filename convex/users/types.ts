// file: ./convex/users/types.ts
// feature: Chat - User type definitions

import { Id } from "../_generated/dataModel";

export type UserRole = 'member' | 'beta-tester' | 'administrator' | 'sysop' | 'moderator' | 'financier';

export interface UserProfile {
  userId: Id<"users">;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  image?: string;
  bgImageUrl?: string;
  bgImageStorageId?: string | Id<"_storage">;
  bgImageOpacity?: number;
  framebgImageUrl?: string;
  isAnonymous?: boolean;
  isOnline?: boolean;
  isBanned?: boolean;
  isBetaTester?: boolean;
  isHookupEnabled?: boolean;
  lastSeen?: number;
  lastLoginDate?: number;
  emailVerificationTime?: number;
  credits?: number;
}

export interface UserPresence {
  userId: Id<"users">;
  isOnline: boolean;
  lastSeen?: number;
  presenceStatus: string;
  lastActive: number;
}

export interface UserFile {
  _id: Id<"files">;
  url: string;
  name: string;
  storageId: Id<"_storage">;
  contentType: string;
  size: number;
  createdAt: number;
}