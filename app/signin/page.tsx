// file: ./app/signin/page.tsx
// description: Authentication page using the unified Authentication component
// module: Client
// License: MIT
// Author: Andrew Donelson
// Copyright 2025 Andrew Donelson

"use client";
import { Authentication } from "@/components/auth/Authentication";
import { APP_SIGNIN_REDIRECT_ROUTE } from "@/lib/constants";

export default function AuthPage() {
  // Handle successful web3 authentication
  const handleWeb3Success = (address: string, signature: string) => {
    console.log("Authenticated wallet:", address);
    // You could store this in localStorage, context, or make an API call to your backend
  };

  return (
    <Authentication 
      redirectUrl={APP_SIGNIN_REDIRECT_ROUTE}
      methods={{
        traditional: true,
        web3: true,
        defaultTab: 'traditional'
      }}
      traditionalProviders={{
        github: true,
        google: true,
        email: true,
      }}
      wallets={{
        metamask: true,
        walletConnect: true,
        coinbase: false
      }}
      texts={{
        mainTitle: "Welcome",
        mainDescription: "Sign in to your account or authenticate with your wallet",
        traditionalTabText: "Email & Social",
        web3TabText: "Web3 Wallet", 
      }}
      authMessage="Welcome to O2UL! Sign this message to verify your wallet ownership and securely login."
      onWeb3Success={handleWeb3Success}
    />
  );
}