// file: /convex/auth/providers/twitter.ts
// feature: Auth - Twitter provider configuration
// https://developer.x.com/en/portal/projects/1730648149667057664/apps

import { debug } from "../../../lib/utils";
import Twitter from "@auth/core/providers/twitter";


export const twitterProvider = Twitter({
  profile(profile) {
    debug("Auth", "Google Profile", profile);
    return {
      id: profile.id?.toString() || '',
      name: profile.data.name ?? undefined,
      email: profile.data.email ?? undefined,
      image: profile.data.profile_image_url ?? undefined,
    };
  },
});