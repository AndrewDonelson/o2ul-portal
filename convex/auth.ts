// file: /convex/auth.ts
// feature: Auth - Main auth configuration

import { convexAuth } from "@convex-dev/auth/server";
import { authProviders } from "./auth/providers";

// Separate the auth setup from other functionality
const authConfig = convexAuth({
  providers: authProviders,
});

// Export individual pieces instead of everything together
export const auth = authConfig.auth;
export const signIn = authConfig.signIn;
export const signOut = authConfig.signOut;
export const store = authConfig.store;
export const isAuthenticated = authConfig.isAuthenticated;

// Export profile sync separately
export { syncProfile } from "./auth/syncProfile";