// file: ./app/signin/page.tsx
// feature: WebApp Core
"use client";
import { SignInMethodDivider } from "@/components/SignInMethodDivider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useAuthActions } from "@convex-dev/auth/react";
import { FacebookLogo, GitHubLogo, GoogleLogo } from "@/components/SocialLogos";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { TwitterLogoIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { APP_SIGNIN_REDIRECT_ROUTE } from "@/lib/constants";

export default function SignInPage() {
  const [step, setStep] = useState<"signIn" | "linkSent">("signIn");
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full container my-auto mx-auto">
      <div className="max-w-[384px] mx-auto flex flex-col my-auto gap-4 pb-8">
        <PageHeader title="Sign In" description="Sign in or create an account" />
        {step === "signIn" ? (
          <>
            <SignInWithGitHub />
            <SignInWithGoogle />
            {/* 
            <SignInWithTwitter />
            <SignInWithFacebook /> 
            <SignInMethodDivider />
            <SignInWithMagicLink handleLinkSent={() => setStep("linkSent")} />
            */}
          </>
        ) : (
          <>
            <h2 className="font-semibold text-2xl tracking-tight">
              Check your email
            </h2>
            <p>A sign-in link has been sent to your email address.</p>
            <Button
              className="p-0 self-start"
              variant="link"
              onClick={() => setStep("signIn")}
            >
              Cancel
            </Button>
          </>
        )}
        
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-sm text-muted-foreground">
            By signing in, you agree to our
          </p>
          <div className="flex gap-4">
            <Button 
              variant="link" 
              className="text-sm p-0 h-auto" 
              onClick={() => router.push('/privacy-policy')}
            >
              Privacy Policy
            </Button>
            <span className="text-muted-foreground">&middot;</span>
            <Button 
              variant="link" 
              className="text-sm p-0 h-auto"
              onClick={() => router.push('/terms-of-service')}
            >
              Terms of Service
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInWithGitHub() {
  const { signIn } = useAuthActions();
  return (
    <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void signIn("github", { redirectTo: APP_SIGNIN_REDIRECT_ROUTE })}
    >
      <GitHubLogo className="mr-2 h-4 w-4" /> GitHub
    </Button>
  );
}

function SignInWithGoogle() {
  const { signIn } = useAuthActions();
  return (
    <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void signIn("google", { redirectTo: APP_SIGNIN_REDIRECT_ROUTE })}
    >
      <GoogleLogo className="mr-2 h-4 w-4" /> Google
    </Button>
  );
}

function SignInWithTwitter() {
  const { signIn } = useAuthActions();
  return (
    <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void signIn("twitter", { redirectTo: APP_SIGNIN_REDIRECT_ROUTE })}
    >
      <TwitterLogoIcon className="mr-2 h-4 w-4" /> Twitter
    </Button>
  );
}

function SignInWithFacebook() {
  const { signIn } = useAuthActions();
  return (
    <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void signIn("facebook", { redirectTo: APP_SIGNIN_REDIRECT_ROUTE })}
    >
      <FacebookLogo className="mr-2 h-4 w-4" /> Facebook
    </Button>
  );
}

function SignInWithMagicLink({
  handleLinkSent,
}: {
  handleLinkSent: () => void;
}) {
  const { signIn } = useAuthActions();
  const { toast } = useToast();
  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set("redirectTo", APP_SIGNIN_REDIRECT_ROUTE);
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