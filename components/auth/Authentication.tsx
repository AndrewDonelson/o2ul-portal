// file: ./components/auth/Authentication.tsx
// description: Main authentication component that integrates traditional and Web3 sign-in methods
// module: Client
// License: MIT
// Author: Andrew Donelson
// Copyright 2025 Andrew Donelson

"use client";
import { useState } from "react";
import { SignIn } from "./AuthSignIn";
import { Web3SignIn } from "./Web3SignIn";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

// Icons
const EmailIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const WalletIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

export interface AuthenticationConfig {
  /**
   * Redirect URL after successful login
   */
  redirectUrl: string;
  
  /**
   * Which authentication methods to show
   */
  methods?: {
    traditional?: boolean;
    web3?: boolean;
    defaultTab?: 'traditional' | 'web3';
  };
  
  /**
   * Traditional auth provider configuration
   */
  traditionalProviders?: {
    github?: boolean;
    google?: boolean;
    twitter?: boolean;
    facebook?: boolean;
    email?: boolean;
  };
  
  /**
   * Web3 wallet provider configuration
   */
  wallets?: {
    metamask?: boolean;
    walletConnect?: boolean;
    coinbase?: boolean;
  };
  
  /**
   * Authentication message for wallet signing
   */
  authMessage?: string;
  
  /**
   * Backend API endpoint for verifying signatures
   */
  verifyEndpoint?: string;
  
  /**
   * Custom titles and descriptions
   */
  texts?: {
    mainTitle?: string;
    mainDescription?: string;
    traditionalTabText?: string;
    web3TabText?: string;
    traditionalTitle?: string;
    traditionalDescription?: string;
    web3Title?: string;
    web3Description?: string;
    privacyText?: string;
    termsText?: string;
    orText?: string;
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
  
  /**
   * Optional callback for successful Web3 authentication
   */
  onWeb3Success?: (address: string, signature: string) => void;
}

/**
 * Main authentication component that integrates traditional and Web3 sign-in methods
 */
export const Authentication = ({
  redirectUrl,
  methods = {
    traditional: true,
    web3: true,
    defaultTab: 'traditional'
  },
  traditionalProviders = {
    github: true,
    google: true,
    twitter: false,
    facebook: false,
    email: true
  },
  wallets = {
    metamask: true,
    walletConnect: true,
    coinbase: true
  },
  authMessage = "Sign this message to verify you own this wallet and authenticate with our app.",
  verifyEndpoint = "/api/auth/verify-signature",
  texts = {
    mainTitle: "Sign In",
    mainDescription: "Choose your preferred authentication method",
    traditionalTabText: "Email & Social",
    web3TabText: "Crypto Wallet",
    traditionalTitle: "Sign In",
    traditionalDescription: "Sign in with your email or social accounts",
    web3Title: "Connect Wallet",
    web3Description: "Sign in with your crypto wallet",
    privacyText: "Privacy Policy",
    termsText: "Terms of Service",
    orText: "or"
  },
  routes = {
    privacyPolicy: "/privacy-policy",
    termsOfService: "/terms-of-service"
  },
  className = "flex min-h-screen w-full container my-auto mx-auto",
  onWeb3Success
}: AuthenticationConfig) => {
  const [activeTab, setActiveTab] = useState<string>(methods.defaultTab || 'traditional');
  const router = useRouter();
  
  // If only one method is enabled, render just that component
  if (methods.traditional && !methods.web3) {
    return (
      <SignIn
        redirectUrl={redirectUrl}
        providers={traditionalProviders}
        texts={{
          title: texts.traditionalTitle || "Sign In",
          description: texts.traditionalDescription,
          privacyText: texts.privacyText,
          termsText: texts.termsText
        }}
        routes={routes}
        className={className}
      />
    );
  }
  
  if (!methods.traditional && methods.web3) {
    return (
      <Web3SignIn
        redirectUrl={redirectUrl}
        wallets={wallets}
        authMessage={authMessage}
        verifyEndpoint={verifyEndpoint}
        showTraditionalAuth={false}
        texts={{
          title: texts.web3Title || "Connect Wallet",
          description: texts.web3Description,
          privacyText: texts.privacyText,
          termsText: texts.termsText,
          orText: texts.orText || "or"
        }}
        routes={routes}
        className={className}
        onAuthSuccess={onWeb3Success}
      />
    );
  }
  
  // Otherwise render tabbed interface
  return (
    <div className={className}>
      <div className="max-w-[450px] mx-auto flex flex-col my-auto gap-4 pb-8">
        <PageHeader 
          title={texts.mainTitle || "Sign In"} 
          description={texts.mainDescription} 
        />
        
        <Tabs 
          defaultValue={methods.defaultTab || 'traditional'} 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 mb-6">
            {methods.traditional && (
              <TabsTrigger value="traditional" className="flex items-center gap-2">
                <EmailIcon className="w-4 h-4" />
                {texts.traditionalTabText || "Email & Social"}
              </TabsTrigger>
            )}
            {methods.web3 && (
              <TabsTrigger value="web3" className="flex items-center gap-2">
                <WalletIcon className="w-4 h-4" />
                {texts.web3TabText || "Crypto Wallet"}
              </TabsTrigger>
            )}
          </TabsList>
          
          {methods.traditional && (
            <TabsContent value="traditional" className="mt-0">
              <SignIn
                redirectUrl={redirectUrl}
                providers={traditionalProviders}
                texts={{
                  title: texts.traditionalTitle || "Sign In",
                  description: texts.traditionalDescription,
                  privacyText: texts.privacyText,
                  termsText: texts.termsText
                }}
                routes={routes}
                className="p-0"
              />
            </TabsContent>
          )}
          
          {methods.web3 && (
            <TabsContent value="web3" className="mt-0">
              <Web3SignIn
                redirectUrl={redirectUrl}
                wallets={wallets}
                authMessage={authMessage}
                verifyEndpoint={verifyEndpoint}
                showTraditionalAuth={false}
                texts={{
                  title: texts.web3Title || "Connect Wallet",
                  description: texts.web3Description,
                  privacyText: texts.privacyText,
                  termsText: texts.termsText,
                  orText: texts.orText || "or"
                }}
                routes={routes}
                className="p-0"
                onAuthSuccess={onWeb3Success}
              />
            </TabsContent>
          )}
        </Tabs>
        
        {/* Footer is handled by individual components */}
      </div>
    </div>
  );
};