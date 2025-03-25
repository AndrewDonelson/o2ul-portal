// file: ./app/signin/page.tsx
// description: Sign-in page using the reusable SignIn component
// module: Client
// License: MIT
// Author: Andrew Donelson
// Copyright 2025 Andrew Donelson

"use client";
import { SignIn } from "@/components/auth/SignIn";
import { APP_SIGNIN_REDIRECT_ROUTE } from "@/lib/constants";

export default function SignInPage() {
  return (
    <SignIn 
      redirectUrl={APP_SIGNIN_REDIRECT_ROUTE} 
      providers={{
        github: true,
        google: true,
        twitter: false,
        facebook: false,
        email: true
      }}
      texts={{
        title: "Welcome Back",
        description: "Sign in to your account or create a new one"
      }}
    />
  );
}