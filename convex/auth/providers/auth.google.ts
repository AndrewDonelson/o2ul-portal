// file: /convex/auth/providers/google.ts
// feature: Auth - Google provider configuration
// https://console.cloud.google.com/apis/credentials?project=io-gwf-webapp&pli=1

// import Google from "@auth/core/providers/google";
// import { debug } from "../../../lib/utils";

// export const googleProvider = Google({
//   profile(profile) {
//     debug("Auth-Provider", "Google", profile);
//     return {
//       id: profile.sub?.toString() || '',
//       name: profile.name ?? undefined,
//       email: profile.email ?? undefined,
//       image: profile.picture ?? undefined,
//     };
//   },
// });

// file: /convex/auth/providers/auth.google.ts
import Google from "@auth/core/providers/google";
import { debug } from "../../../lib/utils";

export const googleProvider = Google({
  clientId: process.env.AUTH_GOOGLE_ID,
  clientSecret: process.env.AUTH_GOOGLE_SECRET,
  authorization: {
    params: {
      prompt: "select_account",
      access_type: "offline",
      response_type: "code"
    }
  },
  profile(profile) {
    debug("Auth-Provider:Google", "Profile Data:", profile);

    return {
      id: profile.sub,
      name: profile.name || profile.given_name || profile.email?.split('@')[0],
      email: profile.email,
      image: profile.picture,
      // tokenIdentifier: `google:${profile.sub}`,
      // emailVerified: profile.email_verified,
    };
  }
});