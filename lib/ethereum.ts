// file: /lib/ethereum.ts
// description: Helper functions and type definitions for Ethereum/Web3 integration
// module: Client
// License: MIT
// Author: Andrew Donelson
// Copyright 2025 Andrew Donelson

/**
 * Extends the Window interface to include Ethereum provider
 */
declare global {
    interface Window {
      ethereum?: {
        isMetaMask?: boolean;
        isCoinbaseWallet?: boolean;
        isWalletConnect?: boolean;
        isConnected?: () => boolean;
        request: (args: { method: string; params?: any[] }) => Promise<any>;
        on: (event: string, listener: (...args: any[]) => void) => void;
        removeListener: (event: string, listener: (...args: any[]) => void) => void;
        selectedAddress?: string;
        chainId?: string;
        networkVersion?: string;
        _metamask?: {
          isUnlocked: () => Promise<boolean>;
        };
      };
    }
  }
  
  /**
   * Check if Ethereum provider is available in the browser
   * @returns true if ethereum provider is available, false otherwise
   */
  export const isEthereumProviderAvailable = (): boolean => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };
  
  /**
   * Get the Ethereum provider safely
   * @returns The ethereum provider or null if not available
   */
  export const getEthereumProvider = () => {
    if (!isEthereumProviderAvailable()) {
      return null;
    }
    return window.ethereum;
  };
  
  /**
   * Check if MetaMask is installed
   * @returns true if MetaMask is installed, false otherwise
   */
  export const isMetaMaskInstalled = (): boolean => {
    const ethereum = getEthereumProvider();
    return ethereum?.isMetaMask === true;
  };
  
  /**
   * Check if Coinbase Wallet is installed
   * @returns true if Coinbase Wallet is installed, false otherwise
   */
  export const isCoinbaseWalletInstalled = (): boolean => {
    const ethereum = getEthereumProvider();
    return ethereum?.isCoinbaseWallet === true;
  };
  
  /**
   * Check if a wallet is connected
   * @returns true if a wallet is connected, false otherwise
   */
  export const isWalletConnected = (): boolean => {
    const ethereum = getEthereumProvider();
    return ethereum?.isConnected?.() === true;
  };
  
  /**
   * Request accounts from the wallet
   * @returns An array of connected accounts
   * @throws Error if provider is not available or user rejects the request
   */
  export const requestAccounts = async (): Promise<string[]> => {
    const ethereum = getEthereumProvider();
    
    if (!ethereum) {
      throw new Error('Ethereum provider not available');
    }
    
    try {
      return await ethereum.request({ method: 'eth_requestAccounts' });
    } catch (error: any) {
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  };
  
  /**
   * Get the current chain ID
   * @returns The current chain ID as a number
   * @throws Error if provider is not available
   */
  export const getChainId = async (): Promise<number> => {
    const ethereum = getEthereumProvider();
    
    if (!ethereum) {
      throw new Error('Ethereum provider not available');
    }
    
    try {
      const chainIdHex = await ethereum.request({ method: 'eth_chainId' });
      return parseInt(chainIdHex, 16);
    } catch (error: any) {
      throw new Error(`Failed to get chain ID: ${error.message}`);
    }
  };
  
  /**
   * Switch to a specific Ethereum chain
   * @param chainId Chain ID as a hexadecimal string (e.g., '0x1' for Ethereum mainnet)
   * @throws Error if provider is not available or user rejects the request
   */
  export const switchChain = async (chainId: string): Promise<void> => {
    const ethereum = getEthereumProvider();
    
    if (!ethereum) {
      throw new Error('Ethereum provider not available');
    }
    
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        throw new Error('This network is not available in your wallet. You may need to add it manually.');
      }
      throw new Error(`Failed to switch chain: ${error.message}`);
    }
  };
  
  /**
   * Sign a message with the connected wallet
   * @param address The address to sign with
   * @param message The message to sign
   * @returns The signature
   * @throws Error if provider is not available or user rejects the request
   */
  export const signMessage = async (address: string, message: string): Promise<string> => {
    const ethereum = getEthereumProvider();
    
    if (!ethereum) {
      throw new Error('Ethereum provider not available');
    }
    
    try {
      // Convert message to hex (required by some wallets)
      const hexMessage = '0x' + Buffer.from(message).toString('hex');
      
      return await ethereum.request({
        method: 'personal_sign',
        params: [hexMessage, address],
      });
    } catch (error: any) {
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  };
  
  export default {
    isEthereumProviderAvailable,
    getEthereumProvider,
    isMetaMaskInstalled,
    isCoinbaseWalletInstalled,
    isWalletConnected,
    requestAccounts,
    getChainId,
    switchChain,
    signMessage
  };