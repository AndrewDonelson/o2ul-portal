// file: /convex/auth/types.ts
// feature: Auth - Type definitions with provider support

import { Id } from "../_generated/dataModel";

// Supported auth providers
export type AuthProvider = 
  | "google" 
  | "github" 
  | "twitter" 
  | "facebook" 
  | "instagram" 
  | "linkedin"
  | "email"
  | "anonymous";

// Provider-specific auth info interface
export interface ProviderAuthInfo {
  provider: AuthProvider;
  providerId: string;
  tokenIdentifier: string;
  issuer: string;
}

// Facebook specific types
export interface FacebookPictureData {
  data?: {
    url: string;
    width?: number;
    height?: number;
    is_silhouette?: boolean;
  };
}

// Provider-specific field types
export interface ProviderSpecificData {
  picture?: string | FacebookPictureData;
  avatar_url?: string;
  login?: string;
  screen_name?: string;
  profile_image_url_https?: string;
  profilePicture?: {
    displayImage?: string;
  };
  profile_picture?: string;
}

// Interface for raw auth data from providers
export interface RawAuthData extends ProviderSpecificData {
  tokenIdentifier: string;
  issuer: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  image?: string;
  nickname?: string;
  username?: string;
  [key: string]: any;
}

// Common interface for normalized user data across providers
export interface NormalizedAuthData {
  provider: AuthProvider;
  providerId: string;
  tokenIdentifier: string;
  issuer: string;
  email?: string;
  name?: string;
  username?: string;
  image?: string;
}

export interface SignInParams {
  identity: NormalizedAuthData;
  userId: Id<"users">;
  existingProfile: any | null;
  now: number;
  provider: AuthProvider;
}

export interface ProfileData {
  userId: Id<"users">;
  email?: string;
  name?: string;
  username?: string;
  image?: string;
  lastLoginDate: number;
  lastSeen: number;
  isOnline: boolean;
  isAnonymous: boolean;
  provider: AuthProvider;
  providerId: string;
}

export interface ProfileUpdate extends Partial<ProfileData> {
  lastLoginDate: number;
}

export interface UserUpdate {
  name?: string;
  email?: string;
  image?: string;
}

export interface NewProfileData extends Omit<ProfileData, "userId"> {
  userId: Id<"users">;
  credits: number;
  isBanned: boolean;
}

export interface ProfileUpdateParams {
  userId: Id<"users">;
  existingProfile: any;
  username?: string;
  name?: string;
  image?: string;
  email?: string;
  provider: AuthProvider;
  providerId: string;
  now: number;
}

export interface NewProfileParams {
  userId: Id<"users">;
  username?: string;
  name?: string;
  image?: string;
  email?: string;
  provider: AuthProvider;
  providerId: string;
  now: number;
}

// Admin roles enum
export enum AdminRole {
  FINANCIER = "financier",
  MODERATOR = "moderator",
  SYSOP = "sysop",
  ADMINISTRATOR = "administrator"
}

// Permissions enum for granular access control
export enum AdminPermission {
  MANAGE_USERS = "manage_users",
  MANAGE_PROFILES = "manage_profiles",
  MANAGE_HOOKUPS = "manage_hookups",
  MANAGE_SUBSCRIPTIONS = "manage_subscriptions",
  MANAGE_GAMES = "manage_games",
  MANAGE_SETTINGS = "manage_settings",
  MANAGE_NOTIFICATIONS = "manage_notifications",
  VIEW_ANALYTICS = "view_analytics"
}

// Mapping of roles to default permissions
export const RolePermissions: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.FINANCIER]: [
    AdminPermission.MANAGE_SUBSCRIPTIONS
  ],
  [AdminRole.MODERATOR]: [
    AdminPermission.MANAGE_PROFILES,
    AdminPermission.MANAGE_HOOKUPS,
    AdminPermission.MANAGE_GAMES
  ],
  [AdminRole.SYSOP]: [
    AdminPermission.MANAGE_USERS,
    AdminPermission.MANAGE_PROFILES,
    AdminPermission.MANAGE_HOOKUPS,
    AdminPermission.MANAGE_SUBSCRIPTIONS,
    AdminPermission.MANAGE_GAMES,
    AdminPermission.VIEW_ANALYTICS
  ],
  [AdminRole.ADMINISTRATOR]: Object.values(AdminPermission)
};
