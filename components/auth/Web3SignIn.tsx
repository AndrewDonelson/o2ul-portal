// file: ./components/auth/Web3SignIn.tsx
// description: Reusable Web3 sign-in component with multiple wallet providers
// module: Client
// License: MIT
// Author: Andrew Donelson
// Copyright 2025 Andrew Donelson

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { useToast } from "@/components/ui/use-toast";

// UI Components
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SignInMethodDivider } from "@/components/SignInMethodDivider";
import { Toaster } from "@/components/ui/toaster";

// Ethereum helpers
import ethereum from "@/lib/ethereum";

// Import traditional auth components if needed
import { SignIn } from "./AuthSignIn";

// Web3 wallet icons
const MetaMaskIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 212 189" fill="none" {...props}>
    <path d="M61.1242 0L105.845 40.1373L96.4123 17.9744L61.1242 0Z" fill="#E17726"/>
    <path d="M150.725 0L115.686 17.9744L106.005 40.1371L150.725 0Z" fill="#E27625"/>
    <path d="M41.0879 138.854L60.4958 169.241L22.0328 180.782L0 140.587L41.0879 138.854Z" fill="#E27625"/>
    <path d="M170.758 138.854L211.846 140.587L189.813 180.782L151.352 169.241L170.758 138.854Z" fill="#E27625"/>
    <path d="M150.725 0L61.1242 0L71.5578 57.2309L111.776 57.2309L150.725 0Z" fill="#E27625"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M55.3233 57.2315L71.5578 117.596L22.0328 117.596L55.3233 57.2315Z" fill="#E27625"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M156.521 57.2315L189.813 117.596L140.288 117.596L156.521 57.2315Z" fill="#E27625"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M106.245 57.2318L111.777 117.596L71.5578 117.596L106.245 57.2318Z" fill="#E27625"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M106.245 57.2318L140.935 117.596L111.777 117.596L106.245 57.2318Z" fill="#E27625"/>
  </svg>
);

const WalletConnectIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M8.19263 10.3562C15.736 2.8128 28.0236 2.8128 35.567 10.3562L36.5422 11.3314C37.0022 11.7914 37.0022 12.553 36.5422 13.0129L33.4406 16.1146C33.2106 16.3445 32.8298 16.3445 32.5998 16.1146L31.2622 14.777C26.2581 9.77292 17.5015 9.77292 12.4975 14.777L11.0647 16.2098C10.8347 16.4397 10.4539 16.4397 10.2239 16.2098L7.12228 13.1081C6.66228 12.6481 6.66228 11.8865 7.12228 11.4265L8.19263 10.3562ZM41.7884 16.5527L44.5227 19.287C44.9827 19.747 44.9827 20.5085 44.5227 20.9685L32.5469 32.9443C32.0869 33.4043 31.3254 33.4043 30.8654 32.9443L22.7494 24.8284C22.6344 24.7134 22.4487 24.7134 22.3337 24.8284L14.2178 32.9443C13.7578 33.4043 12.9962 33.4043 12.5362 32.9443L0.555157 20.963C0.0951566 20.503 0.0951566 19.7414 0.555157 19.2814L3.28947 16.5472C3.74947 16.0872 4.51105 16.0872 4.97105 16.5472L13.0924 24.6685C13.2074 24.7835 13.3931 24.7835 13.5081 24.6685L21.624 16.5527C22.084 16.0927 22.8456 16.0927 23.3056 16.5527L31.4215 24.6685C31.5365 24.7835 31.7222 24.7835 31.8372 24.6685L39.9531 16.5527C40.4131 16.0927 41.1747 16.0927 41.6347 16.5527H41.7884Z" fill="#3B99FC"/>
  </svg>
);

const CoinbaseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="1024" height="1024" fill="#0052FF"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M152 512C152 710.823 313.177 872 512 872C710.823 872 872 710.823 872 512C872 313.177 710.823 152 512 152C313.177 152 152 313.177 152 512ZM420 396C406.745 396 396 406.745 396 420V604C396 617.255 406.745 628 420 628H604C617.255 628 628 617.255 628 604V420C628 406.745 617.255 396 604 396H420Z" fill="white"/>
  </svg>
);

export interface Web3SignInConfig {
  /**
   * Redirect URL after successful login
   */
  redirectUrl: string;
  
  /**
   * Web3 wallet providers to show
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
   * Whether to show traditional auth options as backup
   */
  showTraditionalAuth?: boolean;
  
  /**
   * Custom titles and descriptions
   */
  texts?: {
    title: string;
    description?: string;
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
  onAuthSuccess?: (address: string, signature: string) => void;
}

/**
 * Web3 Authentication States
 */
type Web3AuthState = 
  | 'disconnected'   // No wallet connected
  | 'connecting'     // Connecting to wallet
  | 'connected'      // Wallet connected, address available
  | 'signing'        // Waiting for signature
  | 'verifying'      // Verifying signature with backend
  | 'authenticated'  // Authentication successful
  | 'error';         // Error during authentication

interface Web3Error {
  code?: number;
  message: string;
}

/**
 * Reusable Web3 sign-in component that supports multiple wallet providers
 */
export const Web3SignIn = ({
  redirectUrl,
  wallets = {
    metamask: true,
    walletConnect: true,
    coinbase: true
  },
  authMessage = "Sign this message to verify you own this wallet and authenticate with our app.",
  verifyEndpoint = "/api/auth/verify-signature",
  showTraditionalAuth = true,
  texts = {
    title: "Connect Wallet",
    description: "Sign in with your crypto wallet or traditional methods",
    privacyText: "Privacy Policy",
    termsText: "Terms of Service",
    orText: "or continue with"
  },
  routes = {
    privacyPolicy: "/privacy-policy",
    termsOfService: "/terms-of-service"
  },
  className = "flex min-h-screen w-full container my-auto mx-auto",
  onAuthSuccess
}: Web3SignInConfig) => {
  const [authState, setAuthState] = useState<Web3AuthState>('disconnected');
  const [error, setError] = useState<Web3Error | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [showingTraditional, setShowingTraditional] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();
  
  // Effect to check for existing connections
  useEffect(() => {
    const checkConnection = async () => {
      if (ethereum.isEthereumProviderAvailable()) {
        try {
          // Check if already connected
          if (ethereum.isWalletConnected()) {
            const accounts = await ethereum.requestAccounts();
            if (accounts.length > 0) {
              setWalletAddress(accounts[0]);
              const chainId = await ethereum.getChainId();
              setChainId(chainId);
              setAuthState('connected');
            }
          }
        } catch (error) {
          console.error("Failed to check existing connection:", error);
        }
      }
    };
    
    checkConnection();
  }, []);
  
  // Connect to MetaMask wallet
  const connectMetaMask = async () => {
    if (!ethereum.isMetaMaskInstalled()) {
      setError({
        message: "MetaMask is not installed. Please install MetaMask and try again."
      });
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask browser extension to continue.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setAuthState('connecting');
      
      // Request account access
      const accounts = await ethereum.requestAccounts();
      
      if (accounts.length === 0) {
        throw new Error("No accounts found. User may have denied access.");
      }
      
      const address = accounts[0];
      setWalletAddress(address);
      
      // Get chain ID
      const chainId = await ethereum.getChainId();
      setChainId(chainId);
      
      setAuthState('connected');
      
      // Auto-proceed to signing
      await signMessage(address);
      
    } catch (error: any) {
      console.error("Error connecting to MetaMask:", error);
      setAuthState('error');
      setError({
        code: error.code,
        message: error.message || "Failed to connect to MetaMask."
      });
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to your wallet.",
        variant: "destructive"
      });
    }
  };
  
  // Connect to WalletConnect
  const connectWalletConnect = async () => {
    toast({
      title: "WalletConnect",
      description: "WalletConnect implementation requires additional setup with a project ID.",
    });
    
    // Implementation would typically use:
    // https://docs.walletconnect.com/web3modal/react/about
  };
  
  // Connect to Coinbase wallet
  const connectCoinbase = async () => {
    toast({
      title: "Coinbase Wallet",
      description: "Coinbase Wallet implementation requires additional setup.",
    });
    
    // Implementation would typically use the Coinbase Wallet SDK:
    // https://docs.cloud.coinbase.com/wallet-sdk/docs/web3modal
  };
  
  // Sign authentication message
  const signMessage = async (address: string) => {
    if (!address || !ethereum.isEthereumProviderAvailable()) return;
    
    try {
      setAuthState('signing');
      
      // Create the message to sign
      const timestamp = Date.now();
      const message = `${authMessage}\n\nWallet address: ${address}\nTimestamp: ${timestamp}`;
      
      // Request signature using our helper
      const signature = await ethereum.signMessage(address, message);
      
      // Proceed to verification
      await verifySignature(address, message, signature);
      
    } catch (error: any) {
      console.error("Error signing message:", error);
      setAuthState('error');
      setError({
        code: error.code,
        message: error.message || "Failed to sign the message."
      });
      toast({
        title: "Signing Failed",
        description: "Failed to sign the authentication message.",
        variant: "destructive"
      });
    }
  };
  
  // Verify signature with backend
  const verifySignature = async (address: string, message: string, signature: string) => {
    try {
      setAuthState('verifying');
      
      // For demonstration, we'll verify locally
      // In production, you should send to your backend API
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Signature verification failed");
      }
      
      // If verification endpoint is provided, call it
      if (verifyEndpoint) {
        // Backend verification API call would go here
        // const response = await fetch(verifyEndpoint, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ address, message, signature })
        // });
        // 
        // if (!response.ok) {
        //   throw new Error("Verification failed on the server");
        // }
        // 
        // const data = await response.json();
      }
      
      // Auth success
      setAuthState('authenticated');
      
      // Callback if provided
      if (onAuthSuccess) {
        onAuthSuccess(address, signature);
      }
      
      // Show success message
      toast({
        title: "Authentication Successful",
        description: "Your wallet has been verified successfully.",
      });
      
      // Redirect after successful authentication
      setTimeout(() => {
        router.push(redirectUrl);
      }, 1500);
      
    } catch (error: any) {
      console.error("Verification failed:", error);
      setAuthState('error');
      setError({
        message: error.message || "Failed to verify your signature."
      });
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify your wallet signature.",
        variant: "destructive"
      });
    }
  };
  
  // Handle wallet disconnection
  const disconnectWallet = () => {
    setWalletAddress(null);
    setChainId(null);
    setAuthState('disconnected');
    setError(null);
  };
  
  // Reset error state
  const resetError = () => {
    setError(null);
    setAuthState('disconnected');
  };
  
  // Get loading text based on auth state
  const getStatusText = () => {
    switch (authState) {
      case 'connecting': return 'Connecting to wallet...';
      case 'signing': return 'Please sign the message in your wallet...';
      case 'verifying': return 'Verifying signature...';
      case 'authenticated': return 'Authentication successful!';
      default: return '';
    }
  };
  
  return (
    <div className={className}>
      <div className="max-w-[384px] mx-auto flex flex-col my-auto gap-4 pb-8">
        <PageHeader title={texts.title} description={texts.description} />
        
        {showingTraditional ? (
          // Show traditional auth
          <>
            <SignIn 
              redirectUrl={redirectUrl}
              className="p-0"
              routes={routes}
            />
            <Button 
              variant="outline" 
              onClick={() => setShowingTraditional(false)}
              className="mt-2"
            >
              Back to Wallet Options
            </Button>
          </>
        ) : (
          // Show wallet connection options
          <>
            {/* Wallet connection status */}
            {authState !== 'disconnected' && authState !== 'error' && (
              <div className="bg-secondary p-3 rounded-md text-center mb-2">
                {getStatusText()}
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="bg-destructive/20 p-3 rounded-md mb-2">
                <p className="text-destructive text-sm font-medium">{error.message}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetError} 
                  className="mt-2 h-8"
                >
                  Try Again
                </Button>
              </div>
            )}
            
            {/* Connected wallet info */}
            {walletAddress && authState === 'connected' && (
              <div className="bg-secondary p-3 rounded-md mb-2">
                <p className="text-xs">Connected Wallet</p>
                <p className="font-mono text-sm truncate">{walletAddress}</p>
                <div className="flex justify-between mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => signMessage(walletAddress)}
                  >
                    Sign & Login
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={disconnectWallet}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
            
            {/* Wallet connection buttons */}
            {(authState === 'disconnected' || authState === 'error') && (
              <div className="flex flex-col gap-3">
                {wallets.metamask && (
                  <Button 
                    variant="outline" 
                    onClick={connectMetaMask}
                    className="flex justify-center items-center"
                  >
                    <MetaMaskIcon className="mr-2 h-5 w-5" /> 
                    MetaMask
                  </Button>
                )}
                
                {wallets.walletConnect && (
                  <Button 
                    variant="outline" 
                    onClick={connectWalletConnect}
                    className="flex justify-center items-center"
                  >
                    <WalletConnectIcon className="mr-2 h-5 w-5" /> 
                    WalletConnect
                  </Button>
                )}
                
                {wallets.coinbase && (
                  <Button 
                    variant="outline" 
                    onClick={connectCoinbase}
                    className="flex justify-center items-center"
                  >
                    <CoinbaseIcon className="mr-2 h-5 w-5" /> 
                    Coinbase Wallet
                  </Button>
                )}
              </div>
            )}
            
            {/* Option to use traditional auth */}
            {showTraditionalAuth && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {texts.orText}
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowingTraditional(true)}
                >
                  Email & Social Login
                </Button>
              </>
            )}
          </>
        )}
        
        {/* Footer with terms */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-sm text-muted-foreground">
            By signing in, you agree to our
          </p>
          <div className="flex gap-4">
            <Button 
              variant="link" 
              className="text-sm p-0 h-auto" 
              onClick={() => router.push(routes.privacyPolicy)}
            >
              {texts.privacyText || "Privacy Policy"}
            </Button>
            <span className="text-muted-foreground">&middot;</span>
            <Button 
              variant="link" 
              className="text-sm p-0 h-auto"
              onClick={() => router.push(routes.termsOfService)}
            >
              {texts.termsText || "Terms of Service"}
            </Button>
          </div>
        </div>
        
        <Toaster />
      </div>
    </div>
  );
};