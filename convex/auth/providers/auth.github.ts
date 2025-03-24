// file: /convex/auth/providers/github.ts
// feature: Auth - GitHub provider configuration
// https://github.com/settings/developers

import GitHub from "@auth/core/providers/github";
import { debug } from "../../../lib/utils";

export const githubProvider = GitHub({
  profile(profile) {
    debug("Auth-Provider", "Github", profile);
    return {
      id: profile.id?.toString() || '',
      name: profile.name ?? undefined,
      email: profile.email ?? undefined,
      image: profile.avatar_url ?? undefined,
      // tokenIdentifier: `github:${profile.sub}`,
      // emailVerified: profile.email_verified,
    };
  },
});