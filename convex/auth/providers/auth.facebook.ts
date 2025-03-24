// file: /convex/auth/providers/facebook.ts
// feature: Auth - Facebook provider configuration
// https://developers.facebook.com/apps/

import { debug } from "../../../lib/utils";
import Facebook from "@auth/core/providers/facebook";

export const facebookProvider = Facebook({
  profile(profile) {
    debug("Auth", "Facebook Profile", profile);
    return {
      id: profile.id?.toString() || '',
      name: profile.data.name ?? undefined,
      email: profile.data.email ?? undefined,
      image: profile.data.profile_image_url ?? undefined,
    };
  },
});