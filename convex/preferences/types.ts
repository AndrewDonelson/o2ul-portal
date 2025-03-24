// file: /convex/preferences/types.ts
// feature: Core - App preferences type definitions

import { Id } from "../_generated/dataModel";

export const APP_MODES = {
  LIVE: "live",
  BETA: "beta",
  OFFLINE: "offline"
} as const;

export type AppMode = typeof APP_MODES[keyof typeof APP_MODES];

export const OAUTH_PROVIDERS = {
  GITHUB: "github",
  GOOGLE: "google",
  FACEBOOK: "facebook",
  TWITTER: "twitter",
  APPLE: "apple",
  MICROSOFT: "microsoft",
  DISCORD: "discord",
  TWITCH: "twitch",
  SPOTIFY: "spotify",
  INSTAGRAM: "instagram",
  LINKEDIN: "linkedin",
  REDDIT: "reddit",
  SLACK: "slack"
} as const;

export type OAuthProvider = typeof OAUTH_PROVIDERS[keyof typeof OAUTH_PROVIDERS];

export interface SystemPreferences {
  _id: Id<"preferences">;
  mode: AppMode;
  enableCalling: boolean;
  enabledOAuthProviders?: string[];
  lastUpdated: number;
  updatedBy: Id<"users">;
}

export interface PreferenceUpdate {
  mode: AppMode;
  enableCalling?: boolean;
  enabledOAuthProviders?: string[];
  updatedBy: Id<"users">;
  lastUpdated: number;
}