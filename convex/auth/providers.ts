// file: /convex/auth/providers/index.ts
// feature: Auth - Provider configuration exports

import { githubProvider } from "./providers/auth.github";
import { googleProvider } from "./providers/auth.google";
import { twitterProvider } from "./providers/auth.twitter";
import { facebookProvider } from "./providers/auth.facebook";
import Resend from "@auth/core/providers/resend";

export const authProviders = [
  githubProvider,
  googleProvider,
  twitterProvider,
  facebookProvider,
  Resend,
];
import { debug } from "../../lib/utils";
import { AuthProvider, NormalizedAuthData, RawAuthData, FacebookPictureData } from "./types";

// Helper function to safely extract image URL from various formats
function extractImageUrl(
  rawImage: string | FacebookPictureData | undefined,
  fallbackImage?: string
): string | undefined {
  if (typeof rawImage === 'string') {
    return rawImage;
  }
  if (typeof rawImage === 'object' && rawImage?.data?.url) {
    return rawImage.data.url;
  }
  return fallbackImage;
}

/**
 * Process Google authentication data
 */
export function processGoogleAuth(rawData: RawAuthData): NormalizedAuthData {
  debug("Auth Provider", "Processing Google auth", rawData);
  
  return {
    provider: "google",
    providerId: rawData.tokenIdentifier.split(":")[1],
    tokenIdentifier: rawData.tokenIdentifier,
    issuer: rawData.issuer,
    email: rawData.email,
    name: rawData.name,
    username: rawData.email?.split("@")[0] || rawData.name,
    image: extractImageUrl(rawData.picture, rawData.image)
  };
}

/**
 * Process GitHub authentication data
 */
export function processGithubAuth(rawData: RawAuthData): NormalizedAuthData {
  debug("Auth Provider", "Processing GitHub auth", rawData);
  
  return {
    provider: "github",
    providerId: rawData.tokenIdentifier.split(":")[1],
    tokenIdentifier: rawData.tokenIdentifier,
    issuer: rawData.issuer,
    email: rawData.email,
    name: rawData.name,
    username: rawData.login || rawData.nickname,
    image: extractImageUrl(rawData.avatar_url, rawData.image)
  };
}

/**
 * Process Twitter authentication data
 */
export function processTwitterAuth(rawData: RawAuthData): NormalizedAuthData {
  debug("Auth Provider", "Processing Twitter auth", rawData);
  
  return {
    provider: "twitter",
    providerId: rawData.tokenIdentifier.split(":")[1],
    tokenIdentifier: rawData.tokenIdentifier,
    issuer: rawData.issuer,
    email: rawData.email,
    name: rawData.name,
    username: rawData.screen_name || rawData.nickname,
    image: extractImageUrl(rawData.profile_image_url_https, rawData.image)
  };
}

/**
 * Process Facebook authentication data
 */
export function processFacebookAuth(rawData: RawAuthData): NormalizedAuthData {
  debug("Auth Provider", "Processing Facebook auth", rawData);
  
  return {
    provider: "facebook",
    providerId: rawData.tokenIdentifier.split(":")[1],
    tokenIdentifier: rawData.tokenIdentifier,
    issuer: rawData.issuer,
    email: rawData.email,
    name: rawData.name,
    username: rawData.username || rawData.name,
    image: extractImageUrl(rawData.picture, rawData.image)
  };
}

/**
 * Process LinkedIn authentication data
 */
export function processLinkedInAuth(rawData: RawAuthData): NormalizedAuthData {
  debug("Auth Provider", "Processing LinkedIn auth", rawData);
  
  const imageUrl = rawData.picture || 
                  rawData.profilePicture?.displayImage ||
                  rawData.image;

  return {
    provider: "linkedin",
    providerId: rawData.tokenIdentifier.split(":")[1],
    tokenIdentifier: rawData.tokenIdentifier,
    issuer: rawData.issuer,
    email: rawData.email,
    name: rawData.name,
    username: rawData.nickname || rawData.email?.split("@")[0],
    image: extractImageUrl(imageUrl)
  };
}

/**
 * Process Instagram authentication data
 */
export function processInstagramAuth(rawData: RawAuthData): NormalizedAuthData {
  debug("Auth Provider", "Processing Instagram auth", rawData);
  
  return {
    provider: "instagram",
    providerId: rawData.tokenIdentifier.split(":")[1],
    tokenIdentifier: rawData.tokenIdentifier,
    issuer: rawData.issuer,
    email: rawData.email,
    name: rawData.name || rawData.username,
    username: rawData.username || rawData.nickname,
    image: extractImageUrl(rawData.profile_picture, rawData.image)
  };
}

/**
 * Process email authentication data
 */
export function processEmailAuth(rawData: RawAuthData): NormalizedAuthData {
  debug("Auth Provider", "Processing Email auth", rawData);
  
  return {
    provider: "email",
    providerId: rawData.email as string,
    tokenIdentifier: rawData.tokenIdentifier,
    issuer: rawData.issuer,
    email: rawData.email,
    name: rawData.name,
    username: rawData.email?.split("@")[0],
    image: extractImageUrl(rawData.image)
  };
}

/**
 * Main function to normalize auth data from any provider
 */
export function normalizeAuthData(rawData: RawAuthData): NormalizedAuthData {
  const provider = rawData.tokenIdentifier.split(":")[0] as AuthProvider;
  debug("Auth Provider", "Normalizing auth data for provider", provider);

  switch (provider) {
    case "google":
      return processGoogleAuth(rawData);
    case "github":
      return processGithubAuth(rawData);
    case "twitter":
      return processTwitterAuth(rawData);
    case "facebook":
      return processFacebookAuth(rawData);
    case "linkedin":
      return processLinkedInAuth(rawData);
    case "instagram":
      return processInstagramAuth(rawData);
    case "email":
      return processEmailAuth(rawData);
    default:
      debug("Auth Provider", "Unknown provider", provider);
      throw new Error(`Unknown authentication provider: ${provider}`);
  }
}