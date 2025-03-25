// file: ./components/auth/SignIn.tsx
// description: Reusable sign-in component with multiple authentication methods
// module: Client
// License: MIT
// Author: Andrew Donelson
// Copyright 2025 Andrew Donelson

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useToast } from "@/components/ui/use-toast";

// UI Components
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { SignInMethodDivider } from "@/components/SignInMethodDivider";
import { FacebookLogo, GitHubLogo, GoogleLogo } from "@/components/SocialLogos";
import { TwitterLogoIcon } from "@radix-ui/react-icons";

export interface SignInConfig {
  /**
   * Redirect URL after successful login
   */
  redirectUrl: string;
  
  /**
   * Which authentication providers to show
   */
  providers?: {
    github?: boolean;
    google?: boolean;
    twitter?: boolean;
    facebook?: boolean;
    email?: boolean;
  };
  
  /**
   * Custom titles and descriptions
   */
  texts?: {
    title: string;
    description?: string;
    privacyText?: string;
    termsText?: string;
  };
  
  /**
   * Custom page routes
   */
  routes?: {
    privacyPolicy: string;
    termsOfService: string;
  };
  
  /**
   * Custom container class names
   */
  className?: string;
}

/**
 * Reusable sign-in component that supports multiple authentication methods
 */
export const SignIn = ({
  redirectUrl,
  providers = {
    github: true,
    google: true,
    twitter: false,
    facebook: false,
    email: false
  },
  texts = {
    title: "Sign In",
    description: "Sign in or create an account",
    privacyText: "Privacy Policy",
    termsText: "Terms of Service"
  },
  routes = {
    privacyPolicy: "/privacy-policy",
    termsOfService: "/terms-of-service"
  },
  className = "flex min-h-screen w-full container my-auto mx-auto"
}: SignInConfig) => {
  const [step, setStep] = useState<"signIn" | "linkSent">("signIn");
  const router = useRouter();

  return (
    <div className={className}>
      <div className="max-w-[384px] mx-auto flex flex-col my-auto gap-4 pb-8">
        <PageHeader title={texts.title || "Sign In"} description={texts.description} />
        
        {step === "signIn" ? (
          <>
            {providers.github && <SignInWithGitHub redirectUrl={redirectUrl} />}
            {providers.google && <SignInWithGoogle redirectUrl={redirectUrl} />}
            {providers.twitter && <SignInWithTwitter redirectUrl={redirectUrl} />}
            {providers.facebook && <SignInWithFacebook redirectUrl={redirectUrl} />}
            
            {providers.email && (
              <>
                {(providers.github || providers.google || providers.twitter || providers.facebook) && (
                  <SignInMethodDivider />
                )}
                <SignInWithMagicLink 
                  redirectUrl={redirectUrl} 
                  handleLinkSent={() => setStep("linkSent")} 
                />
              </>
            )}
          </>
        ) : (
          <MagicLinkSent onCancel={() => setStep("signIn")} />
        )}
        
        <TermsFooter 
          privacyUrl={routes.privacyPolicy || "/privacy-policy"} 
          termsUrl={routes.termsOfService || "/terms-of-service"}
          privacyText={texts.privacyText}
          termsText={texts.termsText}
        />
      </div>
    </div>
  );
};

// Individual provider components
interface ProviderProps {
  redirectUrl: string;
}

function SignInWithGitHub({ redirectUrl }: ProviderProps) {
  const { signIn } = useAuthActions();
  return (
    <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void signIn("github", { redirectTo: redirectUrl })}
    >
      <GitHubLogo className="mr-2 h-4 w-4" /> GitHub
    </Button>
  );
}

function SignInWithGoogle({ redirectUrl }: ProviderProps) {
  const { signIn } = useAuthActions();
  return (
    <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void signIn("google", { redirectTo: redirectUrl })}
    >
      <GoogleLogo className="mr-2 h-4 w-4" /> Google
    </Button>
  );
}

function SignInWithTwitter({ redirectUrl }: ProviderProps) {
  const { signIn } = useAuthActions();
  return (
    <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void signIn("twitter", { redirectTo: redirectUrl })}
    >
      <TwitterLogoIcon className="mr-2 h-4 w-4" /> Twitter
    </Button>
  );
}

function SignInWithFacebook({ redirectUrl }: ProviderProps) {
  const { signIn } = useAuthActions();
  return (
    <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void signIn("facebook", { redirectTo: redirectUrl })}
    >
      <FacebookLogo className="mr-2 h-4 w-4" /> Facebook
    </Button>
  );
}

interface MagicLinkProps {
  redirectUrl: string;
  handleLinkSent: () => void;
}

function SignInWithMagicLink({ redirectUrl, handleLinkSent }: MagicLinkProps) {
  const { signIn } = useAuthActions();
  const { toast } = useToast();
  
  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set("redirectTo", redirectUrl);
        signIn("resend", formData)
          .then(handleLinkSent)
          .catch((error) => {
            console.error(error);
            toast({
              title: "Could not send sign-in link",
              variant: "destructive",
            });
          });
      }}
    >
      <label htmlFor="email">Email</label>
      <Input name="email" id="email" className="mb-4" autoComplete="email" />
      <Button type="submit">Send sign-in link</Button>
      <Toaster />
    </form>
  );
}

interface MagicLinkSentProps {
  onCancel: () => void;
}

function MagicLinkSent({ onCancel }: MagicLinkSentProps) {
  return (
    <>
      <h2 className="font-semibold text-2xl tracking-tight">
        Check your email
      </h2>
      <p>A sign-in link has been sent to your email address.</p>
      <Button
        className="p-0 self-start"
        variant="link"
        onClick={onCancel}
      >
        Cancel
      </Button>
    </>
  );
}

interface TermsFooterProps {
  privacyUrl: string;
  termsUrl: string;
  privacyText?: string;
  termsText?: string;
}

function TermsFooter({ 
  privacyUrl, 
  termsUrl,
  privacyText = "Privacy Policy",
  termsText = "Terms of Service"
}: TermsFooterProps) {
  const router = useRouter();
  
  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <p className="text-sm text-muted-foreground">
        By signing in, you agree to our
      </p>
      <div className="flex gap-4">
        <Button 
          variant="link" 
          className="text-sm p-0 h-auto" 
          onClick={() => router.push(privacyUrl)}
        >
          {privacyText}
        </Button>
        <span className="text-muted-foreground">&middot;</span>
        <Button 
          variant="link" 
          className="text-sm p-0 h-auto"
          onClick={() => router.push(termsUrl)}
        >
          {termsText}
        </Button>
      </div>
    </div>
  );
}