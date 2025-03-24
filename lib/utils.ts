// file: ./lib/utils.ts
// features: common utility functions

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { APP_DOMAIN, APP_NAME, appEmail } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Debug logging utility that only runs in development
 * @param name - The name/category of the debug message
 * @param event - The event or message to log
 * @param data - Optional data to display
 */
export function debug(name: string, event: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    if (data !== undefined) {
      console.log(`${name}: ${event}`, data);
    } else {
      console.log(`${name}: ${event}`);
    }
  }
}

/**
 * Formats a string by removing spaces and limiting to 8 characters
 * @param str Input string to format
 * @returns Formatted string with no spaces, max 8 chars
 * Example usage:
 * formatString("Hello World") // returns "HelloWor"
 * formatString("No Spaces Here") // returns "NoSpaces"
 * formatString("Short") // returns "Short"
 * formatString(" Trim  Spaces ") // returns "TrimSpac"
*/
export function formatString8(str: string): string {
  // Remove all spaces and trim
  const noSpaces = str.replace(/\s+/g, '').trim();
  // Limit to 8 characters
  return noSpaces.slice(0, 8);
}


/**
 * Validates an email address string
 * @param email - The email address to validate
 * @returns boolean - True if valid email address, false otherwise
 * 
 * Examples:
 * isValidEmail('test@example.com') // true
 * isValidEmail('invalid.email') // false
 * isValidEmail('test@test@example.com') // false
 * isValidEmail('test+label@example.com') // true
 * isValidEmail('') // false
 * isValidEmail('test@.com') // false
 */
export const isValidEmail = (email: string): boolean => {
  // RFC 5322 compliant email regex
  const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;

  if (!email || typeof email !== 'string') return false;

  // Remove leading/trailing whitespace
  const trimmedEmail = email.trim();

  // Basic length check
  if (trimmedEmail.length < 3 || trimmedEmail.length > 254) return false;

  // Advanced validation using regex
  return emailRegex.test(trimmedEmail);
};

/**
 * Get the current host URL based on environment
 * @returns string The complete base URL for the current environment
 * *
 * Usage examples:
 * Local Dev: https://localhost:3000
 * Production: https://foch.me
 */
export const getHost = (): string => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side environment variables
  const environment = process.env.NODE_ENV;
  const customDomain = process.env.NEXT_PUBLIC_DOMAIN || 'foch.me'; // TODO: add domain to .env

  // Development environment
  if (environment === 'development') {
    return 'https://localhost:3000';
  }

  // Production environment with custom domain
  return `https://${customDomain}`;
};

/**
* Validates password complexity requirements
* @param password - The password to validate
* @returns true if password meets all requirements, false otherwise
*/
export const isValidPassword = (password: string): boolean => {
  // Early return if password is too short
  if (!password || typeof password !== 'string' || password.length < 10) {
    return false;
  }

  // Check for required character types using regex
  const containsUppercase = (password.match(/[A-Z]/g) || []).length >= 2;
  const containsLowercase = (password.match(/[a-z]/g) || []).length >= 2;
  const containsNumbers = (password.match(/[0-9]/g) || []).length >= 2;
  const containsSpecials = (password.match(/[^A-Za-z0-9]/g) || []).length >= 2;

  // All conditions must be true
  return containsUppercase &&
    containsLowercase &&
    containsNumbers &&
    containsSpecials;
};

/**
* Gets detailed password validation errors
* @param password - The password to validate
* @returns Array of validation error messages, empty if password is valid
* 
* Usage examples:
* isValidPassword('Abc12#$def') // true
* isValidPassword('weakpass') // false
 
* getPasswordErrors('weak') 
* Returns:
* [
*   'Password must be at least 10 characters long',
*   'Password must contain at least 2 uppercase letters',
*   'Password must contain at least 2 numbers', 
*   'Password must contain at least 2 special characters'
* ] 
*/
export const getPasswordErrors = (password: string): string[] => {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return ['Password is required'];
  }

  if (password.length < 10) {
    errors.push('Password must be at least 10 characters long');
  }

  if ((password.match(/[A-Z]/g) || []).length < 2) {
    errors.push('Password must contain at least 2 uppercase letters');
  }

  if ((password.match(/[a-z]/g) || []).length < 2) {
    errors.push('Password must contain at least 2 lowercase letters');
  }

  if ((password.match(/[0-9]/g) || []).length < 2) {
    errors.push('Password must contain at least 2 numbers');
  }

  if ((password.match(/[^A-Za-z0-9]/g) || []).length < 2) {
    errors.push('Password must contain at least 2 special characters');
  }

  return errors;
};

/**
 * Replaces template variables in a JSON object with their corresponding values
 * @param json - The JSON object containing template variables
 * @returns The JSON object with replaced values
 * 
 * Example:
 * Input: { "text": "Welcome to {APP_NAME}" }
 * Output: { "text": "Welcome to FOCH.ME" }
 */
export function parseTemplateVars<T>(json: T): T {
  const templateVarRegex = /{([^}]+)}/g;

  // Helper function to get value from constants
  const getConstantValue = (key: string): string => {
    switch (key) {
      case 'APP_NAME':
      case 'APP_AUTHOR':
      case 'APP_DOMAIN':
      case 'APP_URL':
        return APP_NAME;
      case 'APP_EMAIL_PRIVACY':
      case 'APP_EMAIL_LEGAL':
      case 'APP_EMAIL_CONTACT':
        const emailType = key.replace('APP_EMAIL_', '').toLowerCase();
        return appEmail(emailType) || `${emailType}@${APP_DOMAIN}`;
      default:
        return `{${key}}`; // Return original template if no match
    }
  };

  // Deep clone and process the object
  const processValue = (value: any): any => {
    if (typeof value === 'string') {
      return value.replace(templateVarRegex, (_, key) => getConstantValue(key));
    }
    if (Array.isArray(value)) {
      return value.map(item => processValue(item));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, processValue(v)])
      );
    }
    return value;
  };

  return processValue(JSON.parse(JSON.stringify(json)));
}

/**
 * Truncates a string to specified length and appends ellipsis
 * @param str String to truncate
 * @param length Desired maximum length
 * @returns Truncated string with ellipsis if needed
 * 
 * Examples:
 * truncateString("Hello World", 8) // "Hel..."
 * truncateString("Hi", 8) // "Hi"
 * truncateString("Hello World", 3) // "..."
 */
export function truncateString(str: string, length: number): string {
  if (!str) return '';
  if (str.length <= length) return str;
  if (length <= 3) return '...';

  return str.slice(0, length - 3) + '...';
}

/*
 * Formats a string for display in summaries
 * @param str Input string to format
 * @returns Formatted string with ellipsis if longer than 11 characters
 * 
 * Examples:
 * summaryString("Hello World") // "Hell...orld"
 * summaryString("Short") // "Short"
 * summaryString("") // "[Empty]"
 */
export function summaryString(str?: string | null): string {
  // Handle undefined or null input
  if (str == null) {
    return '[Empty]';
  }

  // Ensure input is converted to string
  const safeStr = String(str);

  // Return original string if <= 11 characters
  if (safeStr.length <= 11) {
    return safeStr;
  }

  // Get first 4 and last 4 characters
  const start = safeStr.slice(0, 4);
  const end = safeStr.slice(-4);

  // Return formatted string
  return `${start}...${end}`;
}

/**
 * Formats a number using compact notation
 * @param num Number to format
 * @returns Formatted number as a string
 * 
 * Examples:
 * formatNumber(1000) // "1K"
 * formatNumber(1234567) // "1.2M"
 * formatNumber(987654321) // "988M"
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(num);
}

/**
 * Generates a default username from a userId
 * @param userId User ID to generate username from
 * @returns Generated username in format User{First3}{Last3}
 * 
 * Examples:
 * generateDefaultUsername("abc123xyz") // "User-abcxyz"
 * generateDefaultUsername("12") // "User12"
 */
export function generateDefaultUsername(userId: string): string {
  if (!userId) return 'User';

  const first3 = userId.slice(0, 3);
  const last3 = userId.slice(-3);

  return `User-${first3}${last3}`;
}

/**
 * Extracts the username from an email address
 * @param email Email address to extract username from
 * @returns Username extracted from email address
 * 
 */
export function getUsernameFromEmail(email: string): string | null {
  if (!isValidEmail(email)) return null;
  const emailRegex = /^([^@]+)@/;
  const match = email.match(emailRegex);
  return match ? match[1] : null;
}

/**
 * Converts a base64 string to a Uint8Array for VAPID public key usage
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Helper for getting browser settings paths
 */
export function openBrowserSettings(permissionType: string) {
  let settingsUrl = '';
  let instructions = '';

  // Different browsers have different settings URLs
  if (navigator.userAgent.includes('Chrome')) {
    switch (permissionType) {
      case 'notifications':
        settingsUrl = 'chrome://settings/content/notifications';
        instructions = 'Go to Chrome Settings > Privacy and Security > Site Settings > Notifications';
        break;
      case 'camera':
        settingsUrl = 'chrome://settings/content/camera';
        instructions = 'Go to Chrome Settings > Privacy and Security > Site Settings > Camera';
        break;
      case 'microphone':
        settingsUrl = 'chrome://settings/content/microphone';
        instructions = 'Go to Chrome Settings > Privacy and Security > Site Settings > Microphone';
        break;
      case 'location':
        settingsUrl = 'chrome://settings/content/location';
        instructions = 'Go to Chrome Settings > Privacy and Security > Site Settings > Location';
        break;
      default:
        instructions = 'Go to Chrome Settings > Privacy and Security > Site Settings';
    }
  } else if (navigator.userAgent.includes('Firefox')) {
    instructions = 'Go to Firefox Preferences > Privacy & Security > Permissions';
  } else if (navigator.userAgent.includes('Safari')) {
    instructions = 'Go to Safari Preferences > Websites';
  } else {
    instructions = 'Please check your browser settings to manage permissions';
  }

  // Show alert with instructions since direct links only work in Chrome
  alert(`To change ${permissionType} permissions: ${instructions}`);

  // Try to open settings URL if in Chrome (may not work due to security restrictions)
  try {
    if (settingsUrl && navigator.userAgent.includes('Chrome')) {
      window.open(settingsUrl, '_blank');
    }
  } catch (error) {
    console.log('Unable to open settings directly. Please follow the instructions manually.');
  }
}

/**
 * Save current path to session storage for offline fallback
 */
export function saveCurrentPath() {
  if (typeof window !== 'undefined') {
    try {
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('lastPath', currentPath);

      // Also inform service worker if available
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SAVE_PATH',
          path: currentPath
        });
      }
    } catch (err) {
      // Ignore errors with sessionStorage
    }
  }
}